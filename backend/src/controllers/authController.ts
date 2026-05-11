import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as auth from '../services/authService.js';
import { buildAccountExport } from '../services/exportService.js';
import { setRefreshCookie, clearRefreshCookie } from '../utils/cookies.js';

export const registerSchema = z.object({
  name: z.string().min(1).max(80),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'letters, numbers, underscore only'),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(3),
  password: z.string().min(1),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
  recoveryCode: z.string().min(6).max(40).optional(),
});

export const verifyEmailSchema = z.object({ token: z.string().min(10) });
export const resendSchema = z.object({ email: z.string().email() });
export const forgotSchema = z.object({ email: z.string().email() });
export const resetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(128),
});

export const register = asyncHandler(async (req, res) => {
  const user = await auth.register(req.body);
  res.status(201).json({
    user,
    message: 'Registration successful — check your email (or backend console) for the verification link.',
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await auth.verifyEmail(req.body.token);
  res.json({ user, message: 'Email verified — you can now log in.' });
});

export const resendVerification = asyncHandler(async (req, res) => {
  await auth.resendVerification(req.body.email);
  res.json({ message: 'If that email is registered, a new verification link has been sent.' });
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await auth.login(req.body, {
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  });
  setRefreshCookie(res, refreshToken);
  res.json({ user, accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.rt;
  if (!token) throw ApiError.unauthorized('No refresh token');
  const { user, accessToken, refreshToken } = await auth.refresh(token);
  setRefreshCookie(res, refreshToken);
  res.json({ user, accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.userId) await auth.logout(req.userId);
  clearRefreshCookie(res);
  res.json({ message: 'Logged out' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await auth.forgotPassword(req.body.email);
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await auth.resetPassword(req.body.token, req.body.newPassword);
  res.json({ message: 'Password reset successful — please log in with your new password.' });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const user = await auth.getCurrentUser(req.userId);
  res.json({ user });
});

const NOTIFICATION_TYPE_KEYS = [
  'badge_earned',
  'goal_completed',
  'goal_module_completed',
  'quiz_passed',
  'challenge_posted',
  'challenge_won',
  'challenge_resolved',
  'sync_complete',
  'sync_failed',
  'group_joined',
  'mentor_replied',
  'contest_started',
  'contest_report_ready',
] as const;

export const updatePreferencesSchema = z.object({
  theme: z.enum(['dark', 'light']).optional(),
  notifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  soundEffects: z.boolean().optional(),
  voiceMuteByDefault: z.boolean().optional(),
  notificationPrefs: z
    .record(z.enum(NOTIFICATION_TYPE_KEYS), z.boolean())
    .optional(),
  // Per-type EMAIL opt-out (independent of in-app prefs above). Lets users
  // keep the in-app ping but skip the inbox for chosen types.
  emailNotificationPrefs: z
    .record(z.enum(NOTIFICATION_TYPE_KEYS), z.boolean())
    .optional(),
});
export const updatePreferences = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const user = await auth.updatePreferences(req.userId, req.body);
  res.json({ user });
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
export const changePassword = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await auth.changePassword(req.userId, req.body.currentPassword, req.body.newPassword);
  clearRefreshCookie(res); // current session is also invalidated
  res.json({ message: 'Password changed — please log in again.' });
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal('DELETE'),
});
export const deleteAccount = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const summary = await auth.deleteAccount(req.userId, req.body.password);
  clearRefreshCookie(res);
  res.json({ message: 'Account deleted.', summary });
});

export const exportData = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const dump = await buildAccountExport(req.userId);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `learnhub-${dump.user.username}-${stamp}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(dump, null, 2));
});

// ---------------- 2FA ----------------
export const start2fa = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await auth.start2faSetup(req.userId);
  res.json(out);
});

export const confirm2faSchema = z.object({ code: z.string().regex(/^\d{6}$/) });
export const confirm2fa = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await auth.confirm2faSetup(req.userId, req.body.code);
  res.json(out);
});

export const disable2faSchema = z.object({
  password: z.string().min(1),
  code: z.string().regex(/^\d{6}$/).optional(),
});
export const disable2fa = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await auth.disable2fa(req.userId, req.body.password, req.body.code);
  res.json({ ok: true });
});

export const regenerate2faSchema = z.object({ code: z.string().regex(/^\d{6}$/) });
export const regenerate2fa = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await auth.regenerate2faRecoveryCodes(req.userId, req.body.code);
  res.json(out);
});
