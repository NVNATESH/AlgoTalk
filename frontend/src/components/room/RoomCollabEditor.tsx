'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import type { editor as MonacoTypes } from 'monaco-editor';
import { getAccessToken } from '@/lib/api';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-bg-card/50">
      <Loader2 className="h-6 w-6 animate-spin text-accent-violet" />
    </div>
  ),
});

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:5000').replace(/\/$/, '');

const COLOR_PALETTE = [
  '#a78bfa', '#f472b6', '#34d399', '#facc15', '#fb7185', '#22d3ee',
  '#f97316', '#84cc16', '#c084fc', '#2dd4bf',
];

function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}

export interface ConnectionStatus {
  connected: boolean;
  syncing: boolean;
}

export interface AwarenessUser {
  clientId: number;
  userId: string;
  name: string;
  color: string;
  isSelf: boolean;
}

export function RoomCollabEditor({
  roomId,
  language,
  readOnly,
  initialContent,
  user,
  onStatusChange,
  onAwarenessChange,
}: {
  roomId: string;
  language: string;
  readOnly: boolean;
  initialContent: string;
  user: { id: string; name: string; username: string };
  onStatusChange: (s: ConnectionStatus) => void;
  onAwarenessChange: (peers: AwarenessUser[]) => void;
}) {
  const editorRef = useRef<MonacoTypes.IStandaloneCodeEditor | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const initialContentRef = useRef(initialContent);
  const [editorReady, setEditorReady] = useState(false);

  // Toggle Monaco's readOnly when role changes mid-session
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

  const handleMount = (editor: MonacoTypes.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.updateOptions({ readOnly });

    // Create Yjs doc + websocket provider
    const doc = new Y.Doc();
    docRef.current = doc;
    const yText = doc.getText('content');

    const token = getAccessToken();
    const params: Record<string, string> = {};
    if (token) params.token = token;
    const provider = new WebsocketProvider(WS_URL, `yjs/${roomId}`, doc, {
      params,
      connect: true,
    });
    providerRef.current = provider;

    // Awareness setup — give this connection a stable identity
    const color = pickColor(user.id);
    provider.awareness.setLocalStateField('user', {
      userId: user.id,
      name: user.name,
      username: user.username,
      color,
    });

    // Status broadcasting
    const updateStatus = () => {
      onStatusChange({
        connected: provider.wsconnected,
        syncing: provider.wsconnected && !provider.synced,
      });
    };
    provider.on('status', updateStatus);
    provider.on('sync', updateStatus);

    // Awareness broadcasting
    const updateAwareness = () => {
      const states = provider.awareness.getStates();
      const peers: AwarenessUser[] = [];
      for (const [clientId, state] of states.entries()) {
        const u = (state as any)?.user;
        if (!u) continue;
        peers.push({
          clientId,
          userId: u.userId,
          name: u.name,
          color: u.color ?? '#a78bfa',
          isSelf: clientId === provider.awareness.clientID,
        });
      }
      // De-dupe by userId — show one chip per user even if they have multiple tabs
      const dedup = new Map<string, AwarenessUser>();
      for (const p of peers) {
        const existing = dedup.get(p.userId);
        if (!existing || p.isSelf) dedup.set(p.userId, p);
      }
      onAwarenessChange(Array.from(dedup.values()));
    };
    provider.awareness.on('change', updateAwareness);
    updateAwareness();

    // Bind Yjs text to Monaco model
    const model = editor.getModel();
    if (model) {
      const binding = new MonacoBinding(
        yText,
        model,
        new Set([editor]),
        provider.awareness
      );
      bindingRef.current = binding;
    }

    // Seed with initial content if doc is empty after first sync
    provider.once('sync', () => {
      const content = initialContentRef.current;
      if (content && yText.length === 0) {
        yText.insert(0, content);
      }
    });

    setEditorReady(true);
  };

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      docRef.current?.destroy();
      bindingRef.current = null;
      providerRef.current = null;
      docRef.current = null;
    };
    // Only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MonacoEditor
      height="100%"
      language={language === 'plaintext' ? 'plaintext' : language}
      theme="vs-dark"
      onMount={handleMount}
      defaultValue=""
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontLigatures: true,
        smoothScrolling: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: 'gutter',
      }}
    />
  );
}
