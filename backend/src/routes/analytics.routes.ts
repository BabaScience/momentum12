import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/dashboard', analyticsController.getDashboard.bind(analyticsController));
router.get('/trends', analyticsController.getTrends.bind(analyticsController));
router.get('/weekly-report/:weekNumber', analyticsController.getWeeklyReport.bind(analyticsController));
router.get('/completion-heatmap', analyticsController.getCompletionHeatmap.bind(analyticsController));
router.get('/habit-performance', analyticsController.getHabitPerformance.bind(analyticsController));
router.get('/goal-progress/:planId', analyticsController.getGoalProgress.bind(analyticsController));

export { router as analyticsRoutes };

