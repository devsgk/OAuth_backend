import { TokenPayload } from "../types";
export declare function generateAccessToken(userId: string, email: string): string;
export declare function generateRefreshToken(userId: string, email: string): string;
export declare function verifyToken(token: string): TokenPayload | null;
export declare function getAccessTokenExpiresIn(): number;
//# sourceMappingURL=jwt.utils.d.ts.map