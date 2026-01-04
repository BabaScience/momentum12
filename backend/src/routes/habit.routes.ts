import { Router } from 'express';
import { habitController } from '../controllers/habit.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Habit CRUD
router.post('/', habitController.createHabit.bind(habitController));
router.get('/', habitController.getHabits.bind(habitController));
router.get('/today', habitController.getHabitsForToday.bind(habitController));
router.get('/:habitId', habitController.getHabit.bind(habitController));
router.patch('/:habitId', habitController.updateHabit.bind(habitController));
router.delete('/:habitId', habitController.deleteHabit.bind(habitController));

// Habit actions
router.post('/:habitId/archive', habitController.archiveHabit.bind(habitController));
router.get('/:habitId/statistics', habitController.getStatistics.bind(habitController));
router.get('/:habitId/history', habitController.getHistory.bind(habitController));

export { router as habitRoutes };

