import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { IAuthRequest, ITokenPayload } from '../types/index.js';
import { UnauthorizedError } from './errorHandler.js';

export const authenticate = (
  req: IAuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedError('Invalid token format');
    }
    
    const decoded = jwt.verify(token, env.jwt.secret) as ITokenPayload;
    
    if (decoded.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
      return;
    }
    next(error);
  }
};

export const optionalAuth = (
  req: IAuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      next();
      return;
    }
    
    const decoded = jwt.verify(token, env.jwt.secret) as ITokenPayload;
    
    if (decoded.type === 'access') {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
    }
    
    next();
  } catch {
    // Token is invalid but optional, continue without user
    next();
  }
};

