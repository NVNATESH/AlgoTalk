import type { CookieOptions, Response } from 'express';
import { isProd } from '../config/env.js';

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'strict' : 'lax',
  path: '/',
};

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('rt', token, { ...baseOptions, maxAge: REFRESH_TTL_MS });
};

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie('rt', baseOptions);
};
