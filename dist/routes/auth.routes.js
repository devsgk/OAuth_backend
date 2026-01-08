"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Login form submission (called by auth-ui)
router.post('/login', auth_controller_1.handleLogin);
// OAuth 2.0 Token endpoint
router.post('/token', auth_controller_1.handleTokenRequest);
// Protected route - get current user info
router.get('/me', auth_middleware_1.authenticateToken, (req, res) => {
    res.json({
        userId: req.user?.userId,
        email: req.user?.email
    });
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map