export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface AuthorizationCode {
  code: string;
  clientId: string;
  redirectUri: string;
  userId: string;
  email: string;
  expiresAt: Date;
}

export interface OAuthAuthorizeRequest {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  state?: string;
}

export interface OAuthTokenRequest {
  grant_type: 'authorization_code' | 'refresh_token';
  code?: string;
  redirect_uri?: string;
  client_id?: string;
  refresh_token?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
}

export interface OAuthErrorResponse {
  error: string;
  error_description: string;
}

export interface RefreshTokenStore {
  token: string;
  userId: string;
  expiresAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
  client_id: string;
  redirect_uri: string;
  state?: string;
}

// Registered OAuth clients
export interface OAuthClient {
  clientId: string;
  name: string;
  redirectUris: string[];
}
