'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [key: number]: { transcript: string };
  }>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition as SpeechRecognitionCtor | undefined)
    ?? (w.webkitSpeechRecognition as SpeechRecognitionCtor | undefined)
    ?? null;
}

export interface UseSpeechRecognitionResult {
  supported: boolean;
  listening: boolean;
  transcript: string; // committed (final) text
  interim: string; // currently being spoken, not yet final
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(language = 'en-US'): UseSpeechRecognitionResult {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    setSupported(!!Ctor);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        // ignore
      }
    }
    setError(null);
    setInterim('');
    const rec = new Ctor();
    rec.lang = language;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      const msg =
        e.error === 'not-allowed'
          ? 'Microphone permission denied.'
          : e.error === 'no-speech'
            ? 'No speech detected.'
            : e.message || `Speech recognition error: ${e.error}`;
      setError(msg);
    };
    rec.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text = r[0]?.transcript ?? '';
        if (r.isFinal) finalChunk += text;
        else interimChunk += text;
      }
      if (finalChunk) {
        setTranscript((prev) => (prev ? prev + ' ' : '') + finalChunk.trim());
      }
      setInterim(interimChunk);
    };

    try {
      rec.start();
      recRef.current = rec;
    } catch (e) {
      setError((e as Error).message);
    }
  }, [language]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      // ignore
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const rec = recRef.current;
      if (rec) {
        try {
          rec.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}
