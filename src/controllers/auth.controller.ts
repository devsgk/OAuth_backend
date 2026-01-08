import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  User, 
  OAuthTokenRequest, 
  OAuthTokenResponse, 
  OAuthErrorResponse, 
  RefreshTokenStore,
  AuthorizationCode,
  OAuthClient,
  LoginRequest
} from '../types';
import { hashPassword, verifyPassword } from '../utils/password.utils';
import { generateAccessToken, generateRefreshToken, verifyToken, getAccessTokenExpiresIn } from '../utils/jwt.utils';

// In-memory stores (replace with database in production)
const users: Map<string, User> = new Map();
const authorizationCodes: Map<string, AuthorizationCode> = new Map();
const refreshTokens: Map<string, RefreshTokenStore> = new Map();

// Registered OAuth clients
const oauthClients: Map<string, OAuthClient> = new Map();

// Initialize demo data
async function initDemoData() {
  // Create demo user
  const demoEmail = 'demo@example.com';
  if (!users.has(demoEmail)) {
    const passwordHash = await hashPassword('password123');
    users.set(demoEmail, {
      id: uuidv4(),
      email: demoEmail,
      passwordHash,
      createdAt: new Date()
    });
    console.log('Demo user created: demo@example.com / password123');
  }

  // Register demo OAuth client (the frontend app)
  const demoClientId = 'frontend-app';
  if (!oauthClients.has(demoClientId)) {
    oauthClients.set(demoClientId, {
      clientId: demoClientId,
      name: 'Frontend Application',
      redirectUris: [
        'http://localhost:5173/callback',
        'http://localhost:5174/callback',
        'http://localhost:5175/callback',
        'http://localhost:3000/callback',
        process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/callback` : ''
      ].filter(Boolean)
    });
    console.log('Demo OAuth client registered: frontend-app');
  }
}

initDemoData();

function sendOAuthError(res: Response, status: number, error: string, description: string) {
  const errorResponse: OAuthErrorResponse = {
    error,
    error_description: description
  };
  res.status(status).json(errorResponse);
}

// Generate a random authorization code
function generateAuthCode(): string {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

// Handle login form submission
export async function handleLogin(req: Request, res: Response) {
  console.log('Login request body:', JSON.stringify(req.body, null, 2));
  const { email, password, client_id, redirect_uri, state } = req.body as LoginRequest;

  // Validate required fields
  if (!email || !password) {
    console.log('Missing email or password:', { email: !!email, password: !!password });
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!client_id || !redirect_uri) {
    return res.status(400).json({ error: 'OAuth parameters missing' });
  }

  // Validate client
  const client = oauthClients.get(client_id);
  if (!client) {
    return res.status(400).json({ error: 'Invalid client_id' });
  }

  if (!client.redirectUris.includes(redirect_uri)) {
    return res.status(400).json({ error: 'Invalid redirect_uri' });
  }

  // Find user
  const user = users.get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Generate authorization code
  const code = generateAuthCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code expires in 10 minutes

  authorizationCodes.set(code, {
    code,
    clientId: client_id,
    redirectUri: redirect_uri,
    userId: user.id,
    email: user.email,
    expiresAt
  });

  // Build redirect URL with authorization code
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  res.json({ redirect_url: redirectUrl.toString() });
}

// OAuth 2.0 Token Endpoint
export async function handleTokenRequest(req: Request, res: Response) {
  const body: OAuthTokenRequest = req.body;
  const { grant_type } = body;

  if (!grant_type) {
    return sendOAuthError(res, 400, 'invalid_request', 'grant_type is required');
  }

  switch (grant_type) {
    case 'authorization_code':
      return handleAuthorizationCodeGrant(req, res);
    case 'refresh_token':
      return handleRefreshTokenGrant(req, res);
    default:
      return sendOAuthError(res, 400, 'unsupported_grant_type', `Grant type '${grant_type}' is not supported`);
  }
}

async function handleAuthorizationCodeGrant(req: Request, res: Response) {
  const { code, redirect_uri, client_id } = req.body as OAuthTokenRequest;

  if (!code || !redirect_uri || !client_id) {
    return sendOAuthError(res, 400, 'invalid_request', 'code, redirect_uri, and client_id are required');
  }

  // Find and validate authorization code
  const authCode = authorizationCodes.get(code);
  if (!authCode) {
    return sendOAuthError(res, 400, 'invalid_grant', 'Invalid authorization code');
  }

  // Check if code is expired
  if (new Date() > authCode.expiresAt) {
    authorizationCodes.delete(code);
    return sendOAuthError(res, 400, 'invalid_grant', 'Authorization code has expired');
  }

  // Validate client_id and redirect_uri match
  if (authCode.clientId !== client_id || authCode.redirectUri !== redirect_uri) {
    return sendOAuthError(res, 400, 'invalid_grant', 'Client ID or redirect URI mismatch');
  }

  // Delete the code (one-time use)
  authorizationCodes.delete(code);

  // Generate tokens
  const accessToken = generateAccessToken(authCode.userId, authCode.email);
  const refreshToken = generateRefreshToken(authCode.userId, authCode.email);

  // Store refresh token
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
  refreshTokens.set(refreshToken, {
    token: refreshToken,
    userId: authCode.userId,
    expiresAt: refreshExpiresAt
  });

  const response: OAuthTokenResponse = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: getAccessTokenExpiresIn(),
    refresh_token: refreshToken
  };

  res.json(response);
}

async function handleRefreshTokenGrant(req: Request, res: Response) {
  const { refresh_token } = req.body as OAuthTokenRequest;

  if (!refresh_token) {
    return sendOAuthError(res, 400, 'invalid_request', 'refresh_token is required');
  }

  // Verify the refresh token
  const tokenPayload = verifyToken(refresh_token);
  if (!tokenPayload || tokenPayload.type !== 'refresh') {
    return sendOAuthError(res, 401, 'invalid_grant', 'Invalid or expired refresh token');
  }

  // Check if refresh token exists in store
  const storedToken = refreshTokens.get(refresh_token);
  if (!storedToken) {
    return sendOAuthError(res, 401, 'invalid_grant', 'Refresh token has been revoked');
  }

  // Check if token is expired
  if (new Date() > storedToken.expiresAt) {
    refreshTokens.delete(refresh_token);
    return sendOAuthError(res, 401, 'invalid_grant', 'Refresh token has expired');
  }

  // Revoke old refresh token (rotation)
  refreshTokens.delete(refresh_token);

  // Generate new tokens
  const newAccessToken = generateAccessToken(tokenPayload.userId, tokenPayload.email);
  const newRefreshToken = generateRefreshToken(tokenPayload.userId, tokenPayload.email);

  // Store new refresh token
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
  refreshTokens.set(newRefreshToken, {
    token: newRefreshToken,
    userId: tokenPayload.userId,
    expiresAt: refreshExpiresAt
  });

  const response: OAuthTokenResponse = {
    access_token: newAccessToken,
    token_type: 'Bearer',
    expires_in: getAccessTokenExpiresIn(),
    refresh_token: newRefreshToken
  };

  res.json(response);
}
