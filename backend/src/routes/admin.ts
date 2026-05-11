import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import * as c from '../controllers/adminController.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/overview', c.overview);

// Recommended goal templates
router.get('/recommended-goals', c.listRecommendedGoalTemplates);
router.get('/recommended-goals/:goalId', c.getRecommendedGoalTemplate);
router.post(
  '/recommended-goals',
  validateBody(c.createRecommendedGoalSchema),
  c.createRecommendedGoalTemplate
);
router.patch(
  '/recommended-goals/:goalId',
  validateBody(c.updateRecommendedGoalSchema),
  c.updateRecommendedGoalTemplate
);
router.delete('/recommended-goals/:goalId', c.deleteRecommendedGoalTemplate);
router.post(
  '/recommended-goals/:goalId/modules',
  validateBody(c.goalModuleSchema),
  c.addRecommendedGoalModule
);
router.patch(
  '/recommended-goals/:goalId/modules/:moduleId',
  validateBody(c.updateGoalModuleSchema),
  c.updateRecommendedGoalModule
);
router.post(
  '/recommended-goals/:goalId/modules/:moduleId/topics',
  validateBody(c.addGoalTopicSchema),
  c.addRecommendedGoalModuleTopic
);
router.delete(
  '/recommended-goals/:goalId/modules/:moduleId',
  c.deleteRecommendedGoalModule
);
router.post(
  '/recommended-goals/:goalId/modules/:moduleId/problems',
  validateBody(c.addModuleProblemSlugSchema),
  c.addModuleProblemSlug
);
router.delete(
  '/recommended-goals/:goalId/modules/:moduleId/problems/:slug',
  c.removeModuleProblemSlug
);

// Problems
router.get('/problems', c.listProblems);
router.get('/problems/:slug', c.getProblem);
router.post('/problems', validateBody(c.createProblemSchema), c.createProblem);
router.patch('/problems/:slug', validateBody(c.updateProblemSchema), c.updateProblem);
router.delete('/problems/:slug', c.deleteProblem);
router.post('/problems/bulk-import', validateBody(c.bulkImportSchema), c.bulkImport);

// Users
router.patch('/users/:userId/role', validateBody(c.setRoleSchema), c.setUserRole);

// Audit
router.get('/audit', c.auditLog);

// Interview Question Bank
router.get('/interview-questions', c.listInterviewQuestions);
router.get('/interview-questions/:id', c.getInterviewQuestion);
router.post('/interview-questions', validateBody(c.createIQSchema), c.createInterviewQuestion);
router.patch('/interview-questions/:id', validateBody(c.updateIQSchema), c.updateInterviewQuestion);
router.delete('/interview-questions/:id', c.deleteInterviewQuestion);
router.post('/interview-questions/bulk-import', validateBody(c.bulkImportIQSchema), c.bulkImportInterviewQuestions);

export default router;
