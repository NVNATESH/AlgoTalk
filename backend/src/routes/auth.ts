import { Router } from 'express';
import * as c from '../controllers/authController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, strictLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', authLimiter, validateBody(c.registerSchema), c.register);
router.post('/login', authLimiter, validateBody(c.loginSchema), c.login);
router.post('/verify-email', validateBody(c.verifyEmailSchema), c.verifyEmail);
router.post('/resend-verification', strictLimiter, validateBody(c.resendSchema), c.resendVerification);
router.post('/forgot-password', strictLimiter, validateBody(c.forgotSchema), c.forgotPassword);
router.post('/reset-password', authLimiter, validateBody(c.resetSchema), c.resetPassword);
router.post('/refresh', c.refresh);
router.post('/logout', requireAuth, c.logout);
router.get('/me', requireAuth, c.me);

router.patch('/me/preferences', requireAuth, validateBody(c.updatePreferencesSchema), c.updatePreferences);
router.post('/me/change-password', requireAuth, strictLimiter, validateBody(c.changePasswordSchema), c.changePassword);
router.delete('/me', requireAuth, strictLimiter, validateBody(c.deleteAccountSchema), c.deleteAccount);
router.get('/me/export', requireAuth, strictLimiter, c.exportData);

// 2FA
router.post('/me/2fa/start', requireAuth, strictLimiter, c.start2fa);
router.post(
  '/me/2fa/confirm',
  requireAuth,
  strictLimiter,
  validateBody(c.confirm2faSchema),
  c.confirm2fa
);
router.post(
  '/me/2fa/disable',
  requireAuth,
  strictLimiter,
  validateBody(c.disable2faSchema),
  c.disable2fa
);
router.post(
  '/me/2fa/regenerate-codes',
  requireAuth,
  strictLimiter,
  validateBody(c.regenerate2faSchema),
  c.regenerate2fa
);

export default router;
