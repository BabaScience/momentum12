import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', userController.getProfile.bind(userController));
router.patch('/profile', userController.updateProfile.bind(userController));
router.patch('/preferences', userController.updatePreferences.bind(userController));
router.get('/statistics', userController.getStatistics.bind(userController));

export { router as userRoutes };

