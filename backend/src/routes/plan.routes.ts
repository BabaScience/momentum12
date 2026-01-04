import { Router } from 'express';
import { planController } from '../controllers/plan.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Plan CRUD
router.post('/', planController.createPlan.bind(planController));
router.get('/', planController.getPlans.bind(planController));
router.get('/active', planController.getActivePlan.bind(planController));
router.get('/:planId', planController.getPlan.bind(planController));
router.patch('/:planId', planController.updatePlan.bind(planController));
router.delete('/:planId', planController.deletePlan.bind(planController));

// Plan actions
router.post('/:planId/activate', planController.activatePlan.bind(planController));
router.get('/:planId/progress', planController.getPlanProgress.bind(planController));

// Strategic goals
router.post('/:planId/strategic-goals', planController.addStrategicGoal.bind(planController));
router.patch('/:planId/strategic-goals/:goalId', planController.updateStrategicGoal.bind(planController));
router.delete('/:planId/strategic-goals/:goalId', planController.deleteStrategicGoal.bind(planController));

// Weekly goals
router.post('/:planId/weekly-goals', planController.addWeeklyGoal.bind(planController));
router.patch('/:planId/weekly-goals/:goalId', planController.updateWeeklyGoal.bind(planController));

export { router as planRoutes };

