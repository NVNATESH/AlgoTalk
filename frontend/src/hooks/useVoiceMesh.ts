'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/api';

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:5000').replace(/\/$/, '');
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

const DEFAULT_PTT_KEY = 'Space'; // KeyboardEvent.code

export interface VoicePeer {
  connId: string;
  userId: string;
  name: string;
  username: string;
  speaking: boolean;
  hasStream: boolean;
  volume: number; // 0..1
  screenStream: MediaStream | null;
}

export interface VoiceState {
  status: 'idle' | 'connecting' | 'connected' | 'error' | 'full';
  myConnId: string | null;
  peers: VoicePeer[];
  muted: boolean;
  pttActive: boolean; // PTT key is currently held
  sharingScreen: boolean;
  error: string | null;
}

export interface UseVoiceMeshOptions {
  muteByDefault: boolean;
  pttKey?: string; // KeyboardEvent.code, e.g. 'Space'
}

interface PeerEntry {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  connId: string;
  // Whether to act as initiator for the first offer. We elect deterministically
  // by string-comparing connIds: smaller-string connId initiates.
  initiator: boolean;
  audioCtx?: AudioContext;
  analyser?: AnalyserNode;
  rafId?: number;
  volume: number;
  screenStream: MediaStream | null;
  // Senders we added so we can remove them when stopping screen share
  micSender?: RTCRtpSender;
  screenSender?: RTCRtpSender;
}

const SPEAKING_THRESHOLD = 12; // 0..255 — works well for normal mic

export function useVoiceMesh(
  roomId: string | null,
  options: UseVoiceMeshOptions = { muteByDefault: false }
) {
  const [state, setState] = useState<VoiceState>({
    status: 'idle',
    myConnId: null,
    peers: [],
    muted: false,
    pttActive: false,
    sharingScreen: false,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const peerMetaRef = useRef<Map<string, { userId: string; name: string; username: string }>>(
    new Map()
  );
  const myConnIdRef = useRef<string | null>(null);
  const speakingRef = useRef<Set<string>>(new Set());
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // Track current muted intent so the PTT key handler reads fresh state.
  const mutedRef = useRef(false);
  mutedRef.current = state.muted;

  // ---- helpers ------------------------------------------------------------

  const updatePeers = useCallback(() => {
    const peers: VoicePeer[] = [];
    for (const [connId, meta] of peerMetaRef.current.entries()) {
      const entry = peersRef.current.get(connId);
      peers.push({
        connId,
        userId: meta.userId,
        name: meta.name,
        username: meta.username,
        speaking: speakingRef.current.has(connId),
        hasStream: !!entry && entry.audioEl.srcObject !== null,
        volume: entry?.volume ?? 1,
        screenStream: entry?.screenStream ?? null,
      });
    }
    setState((s) => ({ ...s, peers }));
  }, []);

  const sendSignal = useCallback((target: string, payload: unknown) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'signal', target, payload }));
  }, []);

  const setupSpeakerDetection = useCallback(
    (entry: PeerEntry, stream: MediaStream) => {
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new Ctx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        entry.audioCtx = audioCtx;
        entry.analyser = analyser;

        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!entry.analyser) return;
          entry.analyser.getByteFrequencyData(buf);
          let sum = 0;
          for (const v of buf) sum += v;
          const avg = sum / buf.length;
          const isSpeaking = avg > SPEAKING_THRESHOLD;
          const wasSpeaking = speakingRef.current.has(entry.connId);
          if (isSpeaking !== wasSpeaking) {
            if (isSpeaking) speakingRef.current.add(entry.connId);
            else speakingRef.current.delete(entry.connId);
            updatePeers();
          }
          entry.rafId = requestAnimationFrame(tick);
        };
        entry.rafId = requestAnimationFrame(tick);
      } catch {
        // best-effort
      }
    },
    [updatePeers]
  );

  const createPeer = useCallback(
    (connId: string, initiator: boolean): PeerEntry => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);

      const entry: PeerEntry = {
        pc,
        audioEl,
        connId,
        initiator,
        volume: 1,
        screenStream: null,
      };

      // Add local mic track
      const local = localStreamRef.current;
      if (local) {
        for (const track of local.getAudioTracks()) {
          entry.micSender = pc.addTrack(track, local);
        }
      }
      // If we're already sharing screen, push that track too
      const screen = screenStreamRef.current;
      if (screen) {
        for (const track of screen.getVideoTracks()) {
          entry.screenSender = pc.addTrack(track, screen);
        }
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal(connId, { kind: 'ice', candidate: e.candidate });
        }
      };

      pc.ontrack = (e) => {
        const [stream] = e.streams;
        if (e.track.kind === 'audio') {
          audioEl.srcObject = stream;
          audioEl.volume = entry.volume;
          setupSpeakerDetection(entry, stream);
        } else if (e.track.kind === 'video') {
          // Remote screen share
          entry.screenStream = stream;
          // Clean up if remote stops sharing
          e.track.onended = () => {
            entry.screenStream = null;
            updatePeers();
          };
          // Also clear when the stream loses all tracks
          stream.onremovetrack = () => {
            if (stream.getVideoTracks().length === 0) {
              entry.screenStream = null;
              updatePeers();
            }
          };
        }
        updatePeers();
      };

      pc.onnegotiationneeded = async () => {
        if (!entry.initiator) return;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(connId, { kind: 'sdp', sdp: pc.localDescription });
        } catch (err) {
          console.warn('voice negotiation failed', err);
        }
      };

      return entry;
    },
    [sendSignal, setupSpeakerDetection, updatePeers]
  );

  const tearDownPeer = useCallback((connId: string) => {
    const entry = peersRef.current.get(connId);
    if (!entry) return;
    if (entry.rafId !== undefined) cancelAnimationFrame(entry.rafId);
    entry.audioCtx?.close().catch(() => undefined);
    entry.audioEl.srcObject = null;
    entry.audioEl.remove();
    entry.pc.close();
    peersRef.current.delete(connId);
    speakingRef.current.delete(connId);
  }, []);

  const handleSignal = useCallback(
    async (from: string, payload: any) => {
      const entry = peersRef.current.get(from);
      if (!entry) return;
      try {
        if (payload.kind === 'sdp') {
          const desc = new RTCSessionDescription(payload.sdp);
          await entry.pc.setRemoteDescription(desc);
          if (desc.type === 'offer') {
            const answer = await entry.pc.createAnswer();
            await entry.pc.setLocalDescription(answer);
            sendSignal(from, { kind: 'sdp', sdp: entry.pc.localDescription });
          }
        } else if (payload.kind === 'ice' && payload.candidate) {
          await entry.pc.addIceCandidate(payload.candidate);
        }
      } catch (err) {
        console.warn('voice signal apply failed', err);
      }
    },
    [sendSignal]
  );

  // ---- public actions -----------------------------------------------------

  const joinVoice = useCallback(async () => {
    if (!roomId) return;
    if (state.status === 'connecting' || state.status === 'connected') return;
    setState((s) => ({ ...s, status: 'connecting', error: null }));

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : 'Microphone permission denied',
      }));
      return;
    }

    // Apply muteByDefault: start with the mic track disabled.
    const startMuted = optionsRef.current.muteByDefault;
    if (startMuted) {
      for (const t of stream.getAudioTracks()) t.enabled = false;
    }
    setState((s) => ({ ...s, muted: startMuted }));

    const token = getAccessToken();
    const url = `${WS_URL}/voice/${roomId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      if (msg.type === 'room-full') {
        setState((s) => ({ ...s, status: 'full', error: 'Voice room is full (max 4)' }));
        return;
      }

      if (msg.type === 'hello') {
        myConnIdRef.current = msg.myConnId;
        setState((s) => ({ ...s, status: 'connected', myConnId: msg.myConnId }));
        for (const p of msg.peers as Array<{
          connId: string;
          userId: string;
          name: string;
          username: string;
        }>) {
          peerMetaRef.current.set(p.connId, {
            userId: p.userId,
            name: p.name,
            username: p.username,
          });
          const initiator = msg.myConnId < p.connId;
          const entry = createPeer(p.connId, initiator);
          peersRef.current.set(p.connId, entry);
        }
        updatePeers();
        return;
      }

      if (msg.type === 'peer-joined') {
        peerMetaRef.current.set(msg.connId, {
          userId: msg.userId,
          name: msg.name,
          username: msg.username,
        });
        const initiator = (myConnIdRef.current ?? '') < msg.connId;
        const entry = createPeer(msg.connId, initiator);
        peersRef.current.set(msg.connId, entry);
        updatePeers();
        return;
      }

      if (msg.type === 'peer-left') {
        tearDownPeer(msg.connId);
        peerMetaRef.current.delete(msg.connId);
        updatePeers();
        return;
      }

      if (msg.type === 'signal' && msg.from) {
        void handleSignal(msg.from, msg.payload);
      }
    };

    ws.onerror = () => {
      setState((s) => ({ ...s, status: 'error', error: 'Signaling connection error' }));
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
        setState((s) =>
          s.status === 'connected' || s.status === 'connecting'
            ? { ...s, status: 'idle', myConnId: null, peers: [] }
            : s
        );
      }
    };
  }, [roomId, state.status, createPeer, tearDownPeer, handleSignal, updatePeers]);

  const leaveVoice = useCallback(() => {
    const ws = wsRef.current;
    if (ws) {
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
      wsRef.current = null;
    }
    for (const connId of Array.from(peersRef.current.keys())) tearDownPeer(connId);
    peerMetaRef.current.clear();
    speakingRef.current.clear();
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) t.stop();
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      for (const t of screenStreamRef.current.getTracks()) t.stop();
      screenStreamRef.current = null;
    }
    myConnIdRef.current = null;
    setState({
      status: 'idle',
      myConnId: null,
      peers: [],
      muted: false,
      pttActive: false,
      sharingScreen: false,
      error: null,
    });
  }, [tearDownPeer]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) return;
    const nextEnabled = !tracks[0].enabled;
    for (const t of tracks) t.enabled = nextEnabled;
    setState((s) => ({ ...s, muted: !nextEnabled }));
  }, []);

  const setPeerVolume = useCallback(
    (connId: string, volume: number) => {
      const v = Math.max(0, Math.min(1, volume));
      const entry = peersRef.current.get(connId);
      if (!entry) return;
      entry.volume = v;
      entry.audioEl.volume = v;
      updatePeers();
    },
    [updatePeers]
  );

  // ---- screen share -------------------------------------------------------

  const startScreenShare = useCallback(async () => {
    if (state.status !== 'connected') return;
    if (screenStreamRef.current) return;
    // Only one screen share at a time across the mesh
    const alreadySharing = state.peers.some((p) => p.screenStream !== null);
    if (alreadySharing) {
      setState((s) => ({ ...s, error: 'Another participant is already sharing their screen' }));
      return;
    }
    let screen: MediaStream;
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: false,
      });
    } catch (err) {
      // User cancelled the picker — silent
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        console.warn('screen share failed', err);
      }
      return;
    }
    screenStreamRef.current = screen;
    setState((s) => ({ ...s, sharingScreen: true }));

    // Add the video track to every existing peer connection
    const videoTrack = screen.getVideoTracks()[0];
    if (videoTrack) {
      for (const entry of peersRef.current.values()) {
        entry.screenSender = entry.pc.addTrack(videoTrack, screen);
      }
      // When user clicks browser's "Stop sharing" UI, the track ends
      videoTrack.onended = () => {
        void stopScreenShareInner();
      };
    }
  }, [state.status]);

  // Internal stop — also called by the track.onended handler.
  const stopScreenShareInner = useCallback(async () => {
    const screen = screenStreamRef.current;
    if (!screen) return;
    for (const entry of peersRef.current.values()) {
      if (entry.screenSender) {
        try {
          entry.pc.removeTrack(entry.screenSender);
        } catch {
          /* noop */
        }
        entry.screenSender = undefined;
      }
    }
    for (const t of screen.getTracks()) t.stop();
    screenStreamRef.current = null;
    setState((s) => ({ ...s, sharingScreen: false }));
  }, []);

  const stopScreenShare = useCallback(() => {
    void stopScreenShareInner();
  }, [stopScreenShareInner]);

  // ---- push-to-talk -------------------------------------------------------

  // PTT is only active when muteByDefault is on. Holding the key flips the
  // mic track to enabled while held, regardless of the user's current
  // toggleMute state. Releasing restores the prior muted state.
  useEffect(() => {
    if (state.status !== 'connected') return;
    if (!optionsRef.current.muteByDefault) return;
    const pttKey = optionsRef.current.pttKey ?? DEFAULT_PTT_KEY;

    let pressed = false;
    const isTextField = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable
      );
    };

    const onDown = (e: KeyboardEvent) => {
      if (e.code !== pttKey || e.repeat || pressed) return;
      if (isTextField(e.target)) return;
      // No-op if the user has already manually unmuted — don't claim PTT credit.
      if (!mutedRef.current) return;
      pressed = true;
      e.preventDefault();
      const stream = localStreamRef.current;
      if (stream) {
        for (const t of stream.getAudioTracks()) t.enabled = true;
      }
      setState((s) => ({ ...s, pttActive: true }));
    };

    const onUp = (e: KeyboardEvent) => {
      if (e.code !== pttKey || !pressed) return;
      pressed = false;
      e.preventDefault();
      const stream = localStreamRef.current;
      if (stream) {
        // Restore to the user's current muted intent (which may have changed
        // mid-press via the toggle button — unlikely, but cheap to support).
        for (const t of stream.getAudioTracks()) t.enabled = !mutedRef.current;
      }
      setState((s) => ({ ...s, pttActive: false }));
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [state.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => leaveVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    joinVoice,
    leaveVoice,
    toggleMute,
    setPeerVolume,
    startScreenShare,
    stopScreenShare,
    pttKey: options.pttKey ?? DEFAULT_PTT_KEY,
  };
}
