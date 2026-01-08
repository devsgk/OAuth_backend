"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
const jwt_utils_1 = require("../utils/jwt.utils");
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({
            error: 'unauthorized',
            error_description: 'Access token is required'
        });
    }
    const payload = (0, jwt_utils_1.verifyToken)(token);
    if (!payload) {
        return res.status(401).json({
            error: 'invalid_token',
            error_description: 'Access token is invalid or expired'
        });
    }
    if (payload.type !== 'access') {
        return res.status(401).json({
            error: 'invalid_token',
            error_description: 'Invalid token type'
        });
    }
    req.user = payload;
    next();
}
//# sourceMappingURL=auth.middleware.js.map