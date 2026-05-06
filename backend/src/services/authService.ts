import { User, publicUser } from '../models/User.js';
import { Session, describeUserAgent } from '../models/Session.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { hashToken, randomToken, signAccessToken, signRefreshToken } from '../utils/tokens.js';
import { ApiError } from '../utils/ApiError.js';
import { mailer } from './mailer.js';
import { env } from '../config/env.js';
import {
  buildOtpauthUri,
  generateBase32Secret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotp,
} from '../utils/totp.js';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export interface AuthContext {
  ip?: string;
  userAgent?: string;
}

export async function register(input: {
  name: string;
  username: string;
  email: string;
  password: string;
}) {
  const email = input.email.toLowerCase().trim();
  const username = input.username.toLowerCase().trim();

  const exists = await User.findOne({ $or: [{ email }, { username }] }).lean();
  if (exists) {
    if (exists.email === email) throw ApiError.conflict('Email already in use');
    throw ApiError.conflict('Username already taken');
  }

  const passwordHash = await hashPassword(input.password);
  const rawToken = randomToken(32);

  const user = await User.create({
    name: input.name.trim(),
    username,
    email,
    passwordHash,
    verificationToken: hashToken(rawToken),
    verificationExpires: new Date(Date.now() + VERIFY_TTL_MS),
  });

  const link = `${env.CLIENT_URL}/verify?token=${rawToken}`;
  await mailer.sendVerification(email, user.name, link);

  return publicUser(user);
}

export async function verifyEmail(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const user = await User.findOne({
    verificationToken: tokenHash,
    verificationExpires: { $gt: new Date() },
  }).select('+verificationToken +verificationExpires');

  if (!user) throw ApiError.badRequest('Invalid or expired verification token');

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationExpires = undefined;
  await user.save();

  return publicUser(user);
}

export async function resendVerification(email: string) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) return; // do not leak existence
  if (user.isVerified) return;

  const rawToken = randomToken(32);
  user.verificationToken = hashToken(rawToken);
  user.verificationExpires = new Date(Date.now() + VERIFY_TTL_MS);
  await user.save();

  const link = `${env.CLIENT_URL}/verify?token=${rawToken}`;
  await mailer.sendVerification(user.email, user.name, link);
}

export async function login(
  input: { emailOrUsername: string; password: string; totpCode?: string; recoveryCode?: string },
  ctx: AuthContext
) {
  const id = input.emailOrUsername.toLowerCase().trim();
  const user = await User.findOne({ $or: [{ email: id }, { username: id }] }).select(
    '+passwordHash +twoFactorSecret +twoFactorRecoveryCodes'
  );
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  if (!user.isVerified) throw ApiError.forbidden('Email not verified — check your inbox');

  // 2FA gate. Frontend should re-POST with the same body + a totpCode (or
  // recoveryCode) when it sees `code: 'TWO_FACTOR_REQUIRED'`.
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const totp = (input.totpCode ?? '').trim();
    const recovery = (input.recoveryCode ?? '').trim().toUpperCase().replace(/\s+/g, '');
    if (!totp && !recovery) {
      throw new ApiError(401, 'Two-factor code required', { code: 'TWO_FACTOR_REQUIRED' });
    }
    let passed = false;
    if (totp && verifyTotp(user.twoFactorSecret, totp)) {
      passed = true;
    } else if (recovery) {
      const target = hashRecoveryCode(recovery);
      const idx = (user.twoFactorRecoveryCodes ?? []).findIndex(
        (r: any) => r.hash === target && !r.usedAt
      );
      if (idx >= 0) {
        // Burn the recovery code — single-use only.
        (user.twoFactorRecoveryCodes as any)[idx].usedAt = new Date();
        passed = true;
      }
    }
    if (!passed) throw ApiError.unauthorized('Invalid two-factor code');
  }

  user.lastLoginAt = new Date();
  if (ctx.ip) user.lastLoginIp = ctx.ip;
  await user.save();

  // Audit row for the sessions list. Not authoritative for revocation today —
  // refreshTokenVersion is — but visible in the user's settings.
  void Session.create({
    userId: user._id,
    ip: ctx.ip ?? '',
    userAgent: ctx.userAgent ?? '',
    device: describeUserAgent(ctx.userAgent ?? ''),
    tokenVersion: user.refreshTokenVersion ?? 0,
    lastSeenAt: new Date(),
  }).catch(() => undefined);

  const accessToken = signAccessToken({ sub: String(user._id), role: user.role });
  const refreshToken = signRefreshToken({ sub: String(user._id), v: user.refreshTokenVersion ?? 0 });

  return { user: publicUser(user), accessToken, refreshToken };
}

export async function refresh(refreshToken: string) {
  const { verifyRefreshToken } = await import('../utils/tokens.js');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User not found');
  if ((user.refreshTokenVersion ?? 0) !== payload.v) throw ApiError.unauthorized('Refresh token revoked');

  const accessToken = signAccessToken({ sub: String(user._id), role: user.role });
  const newRefresh = signRefreshToken({ sub: String(user._id), v: user.refreshTokenVersion ?? 0 });
  return { user: publicUser(user), accessToken, refreshToken: newRefresh };
}

export async function logout(userId: string) {
  // bump refreshTokenVersion to invalidate all outstanding refresh tokens for this user
  await User.updateOne({ _id: userId }, { $inc: { refreshTokenVersion: 1 } });
}

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) return; // do not leak existence

  const rawToken = randomToken(32);
  user.resetToken = hashToken(rawToken);
  user.resetExpires = new Date(Date.now() + RESET_TTL_MS);
  await user.save();

  const link = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
  await mailer.sendPasswordReset(user.email, user.name, link);
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const user = await User.findOne({
    resetToken: tokenHash,
    resetExpires: { $gt: new Date() },
  }).select('+resetToken +resetExpires +passwordHash');

  if (!user) throw ApiError.badRequest('Invalid or expired reset token');

  user.passwordHash = await hashPassword(newPassword);
  user.resetToken = undefined;
  user.resetExpires = undefined;
  user.refreshTokenVersion = (user.refreshTokenVersion ?? 0) + 1; // invalidate sessions
  await user.save();

  await mailer.sendPasswordChanged(user.email, user.name);
  return publicUser(user);
}

export async function getCurrentUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized('User not found');
  return publicUser(user);
}

export async function updatePreferences(
  userId: string,
  prefs: {
    theme?: 'dark' | 'light';
    notifications?: boolean;
    soundEffects?: boolean;
    voiceMuteByDefault?: boolean;
    notificationPrefs?: Record<string, boolean>;
  }
) {
  const set: Record<string, unknown> = {};
  if (prefs.theme !== undefined) set['preferences.theme'] = prefs.theme;
  if (prefs.notifications !== undefined) set['preferences.notifications'] = prefs.notifications;
  if (prefs.soundEffects !== undefined) set['preferences.soundEffects'] = prefs.soundEffects;
  if (prefs.voiceMuteByDefault !== undefined)
    set['preferences.voiceMuteByDefault'] = prefs.voiceMuteByDefault;
  // Per-type opt-out: send a partial map; we merge into the existing one (set
  // dot-paths so we don't clobber unrelated keys).
  if (prefs.notificationPrefs) {
    for (const [k, v] of Object.entries(prefs.notificationPrefs)) {
      set[`preferences.notificationPrefs.${k}`] = v;
    }
  }
  if (Object.keys(set).length === 0) return getCurrentUser(userId);
  const user = await User.findByIdAndUpdate(userId, { $set: set }, { new: true });
  if (!user) throw ApiError.unauthorized('User not found');
  return publicUser(user);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('User not found');
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Current password is incorrect');
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must differ from current');
  }
  user.passwordHash = await hashPassword(newPassword);
  user.refreshTokenVersion = (user.refreshTokenVersion ?? 0) + 1; // invalidate other sessions
  await user.save();
  await mailer.sendPasswordChanged(user.email, user.name).catch(() => undefined);
}

/**
 * Begin TOTP enrollment. Generates a fresh base32 secret and stores it in
 * `twoFactorPendingSecret` until the user proves they've set up their app by
 * confirming a code in `confirm2faSetup`. Returns the otpauth:// URI for QR
 * rendering and the raw secret for manual entry.
 */
export async function start2faSetup(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized('User not found');
  if (user.twoFactorEnabled) {
    throw ApiError.badRequest('Two-factor is already enabled — disable it first to re-enroll');
  }
  const secret = generateBase32Secret();
  user.twoFactorPendingSecret = secret;
  await user.save();
  const uri = buildOtpauthUri(user.email, secret);
  return { secret, otpauthUri: uri };
}

/**
 * Confirm enrollment by validating a 6-digit code against the pending secret.
 * On success, promote the secret to active, generate 10 single-use recovery
 * codes (returned in plaintext ONCE — the user must save them).
 */
export async function confirm2faSetup(userId: string, code: string) {
  const user = await User.findById(userId).select('+twoFactorPendingSecret');
  if (!user) throw ApiError.unauthorized('User not found');
  if (!user.twoFactorPendingSecret) {
    throw ApiError.badRequest('No pending 2FA setup — start enrollment first');
  }
  if (!verifyTotp(user.twoFactorPendingSecret, code)) {
    throw ApiError.badRequest('Invalid code — try again');
  }
  const recoveryCodes = generateRecoveryCodes(10);
  user.twoFactorSecret = user.twoFactorPendingSecret;
  user.twoFactorPendingSecret = null;
  user.twoFactorEnabled = true;
  user.twoFactorRecoveryCodes = recoveryCodes.map((c) => ({
    hash: hashRecoveryCode(c),
    usedAt: null,
  })) as any;
  await user.save();
  return { recoveryCodes };
}

export async function disable2fa(userId: string, password: string, code?: string) {
  const user = await User.findById(userId).select('+passwordHash +twoFactorSecret');
  if (!user) throw ApiError.unauthorized('User not found');
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Password is incorrect');
  // Require a current TOTP code on disable — same proof-of-possession we ask
  // for on login. Defends against an attacker who has the password but not
  // the authenticator app.
  if (user.twoFactorEnabled) {
    if (!code || !user.twoFactorSecret || !verifyTotp(user.twoFactorSecret, code)) {
      throw ApiError.unauthorized('Invalid two-factor code');
    }
  }
  user.twoFactorEnabled = false;
  user.twoFactorSecret = null;
  user.twoFactorPendingSecret = null;
  user.twoFactorRecoveryCodes = [] as any;
  await user.save();
}

export async function regenerate2faRecoveryCodes(userId: string, code: string) {
  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user) throw ApiError.unauthorized('User not found');
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw ApiError.badRequest('Two-factor is not enabled');
  }
  if (!verifyTotp(user.twoFactorSecret, code)) {
    throw ApiError.unauthorized('Invalid two-factor code');
  }
  const recoveryCodes = generateRecoveryCodes(10);
  user.twoFactorRecoveryCodes = recoveryCodes.map((c) => ({
    hash: hashRecoveryCode(c),
    usedAt: null,
  })) as any;
  await user.save();
  return { recoveryCodes };
}

export async function deleteAccount(userId: string, password: string) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('User not found');
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Password is incorrect');
  // Cascade-delete every record scoped to this user before removing the User
  // row itself (the cascade utility deletes the User as its final step).
  const { cascadeDeleteUser } = await import('./accountCascade.js');
  return cascadeDeleteUser(userId);
}
