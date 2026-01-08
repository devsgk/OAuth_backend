"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLogin = handleLogin;
exports.handleTokenRequest = handleTokenRequest;
const uuid_1 = require("uuid");
const password_utils_1 = require("../utils/password.utils");
const jwt_utils_1 = require("../utils/jwt.utils");
// In-memory stores (replace with database in production)
const users = new Map();
const authorizationCodes = new Map();
const refreshTokens = new Map();
// Registered OAuth clients
const oauthClients = new Map();
// Initialize demo data
async function initDemoData() {
    // Create demo user
    const demoEmail = 'demo@example.com';
    if (!users.has(demoEmail)) {
        const passwordHash = await (0, password_utils_1.hashPassword)('password123');
        users.set(demoEmail, {
            id: (0, uuid_1.v4)(),
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
                'http://localhost:3000/callback',
                process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/callback` : ''
            ].filter(Boolean)
        });
        console.log('Demo OAuth client registered: frontend-app');
    }
}
initDemoData();
function sendOAuthError(res, status, error, description) {
    const errorResponse = {
        error,
        error_description: description
    };
    res.status(status).json(errorResponse);
}
// Generate a random authorization code
function generateAuthCode() {
    return (0, uuid_1.v4)().replace(/-/g, '') + (0, uuid_1.v4)().replace(/-/g, '');
}
// Handle login form submission
async function handleLogin(req, res) {
    console.log('Login request body:', JSON.stringify(req.body, null, 2));
    const { email, password, client_id, redirect_uri, state } = req.body;
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
    const isValidPassword = await (0, password_utils_1.verifyPassword)(password, user.passwordHash);
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
async function handleTokenRequest(req, res) {
    const body = req.body;
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
async function handleAuthorizationCodeGrant(req, res) {
    const { code, redirect_uri, client_id } = req.body;
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
    const accessToken = (0, jwt_utils_1.generateAccessToken)(authCode.userId, authCode.email);
    const refreshToken = (0, jwt_utils_1.generateRefreshToken)(authCode.userId, authCode.email);
    // Store refresh token
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
    refreshTokens.set(refreshToken, {
        token: refreshToken,
        userId: authCode.userId,
        expiresAt: refreshExpiresAt
    });
    const response = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: (0, jwt_utils_1.getAccessTokenExpiresIn)(),
        refresh_token: refreshToken
    };
    res.json(response);
}
async function handleRefreshTokenGrant(req, res) {
    const { refresh_token } = req.body;
    if (!refresh_token) {
        return sendOAuthError(res, 400, 'invalid_request', 'refresh_token is required');
    }
    // Verify the refresh token
    const tokenPayload = (0, jwt_utils_1.verifyToken)(refresh_token);
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
    const newAccessToken = (0, jwt_utils_1.generateAccessToken)(tokenPayload.userId, tokenPayload.email);
    const newRefreshToken = (0, jwt_utils_1.generateRefreshToken)(tokenPayload.userId, tokenPayload.email);
    // Store new refresh token
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
    refreshTokens.set(newRefreshToken, {
        token: newRefreshToken,
        userId: tokenPayload.userId,
        expiresAt: refreshExpiresAt
    });
    const response = {
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: (0, jwt_utils_1.getAccessTokenExpiresIn)(),
        refresh_token: newRefreshToken
    };
    res.json(response);
}
//# sourceMappingURL=auth.controller.js.map