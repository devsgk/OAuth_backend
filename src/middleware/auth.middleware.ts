import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { TokenPayload } from '../types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Access token is required'
    });
  }

  const payload = verifyToken(token);
  
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

