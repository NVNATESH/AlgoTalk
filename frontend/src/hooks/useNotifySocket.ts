'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getAccessToken } from '@/lib/api';
import { useAuth } from '@/stores/authStore';
import { useNotifications } from '@/stores/notificationStore';
import type { Notification } from '@/types/notification';

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:5000').replace(/\/$/, '');

/**
 * Opens a single WS connection to /notify per authenticated session.
 * Reconnects with exponential backoff on close. The store's 30s poll
 * remains active as a fallback for offline windows.
 *
 * Toasts are shown for each pushed notification. Read state is server-driven
 * — the toast is purely a UI nudge.
 */
export function useNotifySocket() {
  const userId = useAuth((s) => s.user?.id ?? null);
  const ingestPush = useNotifications((s) => s.ingestPush);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const closedByUsRef = useRef(false);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!userId) return;
    closedByUsRef.current = false;

    const connect = () => {
      const token = getAccessToken();
      if (!token) {
        // Auth not hydrated yet; retry shortly.
        reconnectTimerRef.current = window.setTimeout(connect, 800);
        return;
      }
      const url = `${WS_URL}/notify?token=${encodeURIComponent(token)}`;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
      };

      ws.onmessage = (ev) => {
        let msg: unknown;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (
          msg &&
          typeof msg === 'object' &&
          (msg as { type?: string }).type === 'notification:new'
        ) {
          const payload = (msg as { payload?: Notification }).payload;
          if (!payload) return;
          ingestPush(payload);
          // Slide-in toast. Sonner picks position from the layout-level Toaster.
          toast(payload.title, {
            description: payload.message || undefined,
            icon: payload.icon ?? '🔔',
            duration:
              payload.priority === 'high' || payload.priority === 'critical' ? 8000 : 4500,
          });
        }
      };

      ws.onerror = () => {
        // Will close shortly; reconnect handled in onclose.
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (closedByUsRef.current) return;
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (closedByUsRef.current) return;
      attemptRef.current = Math.min(attemptRef.current + 1, 6);
      // Backoff: 600ms, 1.2s, 2.4s, 4.8s, 9.6s, 15s cap.
      const delay = Math.min(15_000, 600 * 2 ** (attemptRef.current - 1));
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    };

    connect();

    return () => {
      closedByUsRef.current = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const ws = wsRef.current;
      if (ws) {
        try {
          ws.close();
        } catch {
          /* noop */
        }
      }
      wsRef.current = null;
      attemptRef.current = 0;
    };
  }, [userId, ingestPush]);
}
