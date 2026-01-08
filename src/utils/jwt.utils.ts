import jwt, { SignOptions } from "jsonwebtoken";
import { TokenPayload } from "../types";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

export function generateAccessToken(userId: string, email: string): string {
  const payload: TokenPayload = {
    userId,
    email,
    type: "access",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRES_IN as any };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function generateRefreshToken(userId: string, email: string): string {
  const payload: TokenPayload = {
    userId,
    email,
    type: "refresh",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXPIRES_IN as any };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function getAccessTokenExpiresIn(): number {
  // Return expiration time in seconds
  const expiresIn = ACCESS_TOKEN_EXPIRES_IN;
  if (typeof expiresIn === "string") {
    if (expiresIn.endsWith("h")) {
      return parseInt(expiresIn) * 3600;
    }
    if (expiresIn.endsWith("m")) {
      return parseInt(expiresIn) * 60;
    }
    if (expiresIn.endsWith("d")) {
      return parseInt(expiresIn) * 86400;
    }
  }
  return 3600; // Default 1 hour
}
