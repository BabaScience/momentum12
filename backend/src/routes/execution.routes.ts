import { Router } from 'express';
import { executionController } from '../controllers/execution.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Daily execution
router.get('/today', executionController.getTodayExecution.bind(executionController));
router.get('/history', executionController.getHistory.bind(executionController));
router.get('/heatmap', executionController.getHeatmap.bind(executionController));
router.get('/date/:date', executionController.getExecutionByDate.bind(executionController));
router.get('/:executionId/detail', executionController.getExecution.bind(executionController));

// Habit completion
router.post('/:executionId/habits/:habitId/complete', executionController.completeHabit.bind(executionController));
router.post('/:executionId/habits/:habitId/uncomplete', executionController.uncompleteHabit.bind(executionController));

// Actions
router.post('/:executionId/actions', executionController.addAction.bind(executionController));
router.post('/:executionId/actions/:actionId/complete', executionController.completeAction.bind(executionController));

// Reflection
router.post('/:executionId/reflection', executionController.addReflection.bind(executionController));

export { router as executionRoutes };

