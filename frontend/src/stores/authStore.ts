import { create } from 'zustand';
import { api, setAccessToken } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  isVerified: boolean;
  role: 'user' | 'admin';
  profilePic: string;
  bio: string;
  xp: number;
  level: string;
  preferences: {
    theme: 'dark' | 'light';
    notifications: boolean;
    soundEffects: boolean;
    voiceMuteByDefault: boolean;
    notificationPrefs?: Record<string, boolean>;
  };
  twoFactorEnabled?: boolean;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (
    emailOrUsername: string,
    password: string,
    extra?: { totpCode?: string; recoveryCode?: string }
  ) => Promise<User>;
  register: (input: { name: string; username: string; email: string; password: string }) => Promise<void>;
  verifyEmail: (token: string) => Promise<User>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (
    prefs: Partial<User['preferences']>
  ) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    set({ loading: true });
    try {
      // try refresh first to get an access token from the rt cookie
      const refreshRes = await api<{ user: User; accessToken: string }>('/auth/refresh', {
        method: 'POST',
      }).catch(() => null);
      if (refreshRes) {
        setAccessToken(refreshRes.accessToken);
        set({ user: refreshRes.user });
      }
    } finally {
      set({ loading: false, hydrated: true });
    }
  },

  async login(emailOrUsername, password, extra) {
    const body: Record<string, string> = { emailOrUsername, password };
    if (extra?.totpCode) body.totpCode = extra.totpCode;
    if (extra?.recoveryCode) body.recoveryCode = extra.recoveryCode;
    const res = await api<{ user: User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body,
    });
    setAccessToken(res.accessToken);
    set({ user: res.user });
    return res.user;
  },

  async register(input) {
    await api('/auth/register', { method: 'POST', body: input });
  },

  async verifyEmail(token) {
    const res = await api<{ user: User }>('/auth/verify-email', {
      method: 'POST',
      body: { token },
    });
    return res.user;
  },

  async forgotPassword(email) {
    await api('/auth/forgot-password', { method: 'POST', body: { email } });
  },

  async resetPassword(token, newPassword) {
    await api('/auth/reset-password', { method: 'POST', body: { token, newPassword } });
  },

  async resendVerification(email) {
    await api('/auth/resend-verification', { method: 'POST', body: { email } });
  },

  async logout() {
    await api('/auth/logout', { method: 'POST', auth: true }).catch(() => {});
    setAccessToken(null);
    set({ user: null });
  },

  async updatePreferences(prefs) {
    const res = await api<{ user: User }>('/auth/me/preferences', {
      method: 'PATCH',
      body: prefs,
      auth: true,
    });
    set({ user: res.user });
  },

  async changePassword(currentPassword, newPassword) {
    await api('/auth/me/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
      auth: true,
    });
    // Server invalidated all sessions including this one — clear local state.
    setAccessToken(null);
    set({ user: null });
  },

  async deleteAccount(password) {
    await api('/auth/me', {
      method: 'DELETE',
      body: { password, confirmation: 'DELETE' },
      auth: true,
    });
    setAccessToken(null);
    set({ user: null });
  },
}));
