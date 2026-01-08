import { Router } from 'express';
import { handleLogin, handleTokenRequest } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Login form submission (called by auth-ui)
router.post('/login', handleLogin);

// OAuth 2.0 Token endpoint
router.post('/token', handleTokenRequest);

// Protected route - get current user info
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    userId: req.user?.userId,
    email: req.user?.email
  });
});

export default router;
