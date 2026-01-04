import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter, strictRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Public routes
router.post('/register', authRateLimiter, authController.register.bind(authController));
router.post('/login', authRateLimiter, authController.login.bind(authController));
router.post('/refresh', authRateLimiter, authController.refresh.bind(authController));
router.post('/forgot-password', strictRateLimiter, authController.forgotPassword.bind(authController));

// Protected routes
router.post('/logout', authenticate, authController.logout.bind(authController));
router.post('/change-password', authenticate, authController.changePassword.bind(authController));
router.delete('/account', authenticate, strictRateLimiter, authController.deleteAccount.bind(authController));
router.get('/me', authenticate, authController.getCurrentUser.bind(authController));

export { router as authRoutes };

