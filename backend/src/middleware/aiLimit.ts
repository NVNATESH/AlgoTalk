import rateLimit from 'express-rate-limit';

// Per-IP budget for any Gemini-calling route. Tweak for production / per-user.
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'AI rate limit reached, slow down a bit' },
});
