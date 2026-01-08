"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyToken = verifyToken;
exports.getAccessTokenExpiresIn = getAccessTokenExpiresIn;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
function generateAccessToken(userId, email) {
    const payload = {
        userId,
        email,
        type: "access",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = { expiresIn: ACCESS_TOKEN_EXPIRES_IN };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, options);
}
function generateRefreshToken(userId, email) {
    const payload = {
        userId,
        email,
        type: "refresh",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = { expiresIn: REFRESH_TOKEN_EXPIRES_IN };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, options);
}
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded;
    }
    catch {
        return null;
    }
}
function getAccessTokenExpiresIn() {
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
//# sourceMappingURL=jwt.utils.js.map