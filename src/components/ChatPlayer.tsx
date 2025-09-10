import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatScript, Message } from '../types';
import ChatMessage from './ChatMessage';
import ToolBubble from './ToolBubble';

type Status = 'idle' | 'playing' | 'paused' | 'finished' | 'error';

export interface ChatPlayerHandle {
  play: () => void;
  pause: () => void;
  restart: () => void;
  skip: () => void;
  next: () => void;
  setSpeed: (n: number) => void;
  setDelay: (ms: number) => void;
  getState: () => PlayerStateSnapshot;
}

export interface PlayerStateSnapshot {
  status: Status;
  speed: number;
  delayMs: number;
  idx: number;
  total: number;
  isUserStaging: boolean;
}

interface Props {
  script?: ChatScript | null;
  defaultTypingSpeed?: number; // chars per second
  defaultDelayMs?: number;
  layout?: 'classic' | 'live' | 'liveScript';
  onState?: (s: PlayerStateSnapshot) => void;
}

function useAutoScroll(dep: unknown) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [dep]);
  return ref;
}

const ChatPlayer = forwardRef<ChatPlayerHandle, Props>(function ChatPlayer({ script, defaultTypingSpeed = 35, defaultDelayMs = 500, layout = 'classic', onState }, ref) {
  const [status, setStatus] = useState<Status>('idle');
  const [messages, setMessages] = useState<Message[]>([]); // committed messages
  const [typed, setTyped] = useState(''); // assistant typing buffer
  const [composerText, setComposerText] = useState(''); // staged user text (liveScript layout)
  const [idx, setIdx] = useState(0);
  const [speed, setSpeed] = useState<number>(script?.options?.typingSpeed ?? defaultTypingSpeed);
  const [delayMs, setDelayMs] = useState<number>(script?.options?.messageDelayMs ?? defaultDelayMs);
  const containerRef = useAutoScroll(messages.length + typed.length);

  const current = useMemo(() => script?.messages[idx] ?? null, [script, idx]);

  // Reset when script changes
  useEffect(() => {
    setMessages([]);
    setTyped('');
    setIdx(0);
    setStatus(script ? 'idle' : 'error');
    setSpeed(script?.options?.typingSpeed ?? defaultTypingSpeed);
    setDelayMs(script?.options?.messageDelayMs ?? defaultDelayMs);
  }, [script, defaultTypingSpeed, defaultDelayMs]);

  // Reset composer when restarting or script changes
  useEffect(() => {
    if (status === 'idle') setComposerText('');
  }, [status]);

  // Playback typing loop for normal messages, timed step for tool items
  useEffect(() => {
    if (!script || !current) return;
    if (status !== 'playing') return;

    let cancelled = false;
    const isUser = current.role === 'user' && (!current.kind || current.kind === 'message');
    const isAssistantMessage = current.role !== 'user' && (!current.kind || current.kind === 'message');
    const isTool = current.kind === 'tool_call' || current.kind === 'tool_result';

    // liveScript user staging: type into composerText, not as message bubble yet
    if (layout === 'liveScript' && isUser) {
      const content = current.content ?? '';
      const cps = Math.max(1, speed);
      const interval = 1000 / cps;
      if (composerText.length < content.length) {
        const t = setTimeout(() => {
          if (!cancelled) setComposerText(content.slice(0, composerText.length + 1));
        }, interval);
        return () => { cancelled = true; clearTimeout(t); };
      }
      // Once fully staged, commit after delay
      const commitDelay = setTimeout(() => {
        if (cancelled) return;
        setMessages(prev => [...prev, { ...current, content: content }]);
        setComposerText('');
        setIdx(idx + 1);
        setTyped('');
      }, delayMs);
      return () => { cancelled = true; clearTimeout(commitDelay); };
    }

    // Assistant normal message typing
    if (isAssistantMessage) {
      const content = current.content ?? '';
      const cps = Math.max(1, speed);
      const interval = 1000 / cps;
      if (typed.length < content.length) {
        const t = setTimeout(() => {
          if (!cancelled) setTyped(content.slice(0, typed.length + 1));
        }, interval);
        return () => { cancelled = true; clearTimeout(t); };
      }
      // Commit after delay
      const commitDelay = setTimeout(() => {
        if (cancelled) return;
        setMessages(prev => [...prev, current]);
        setTyped('');
        if (idx + 1 < (script?.messages.length ?? 0)) {
          setIdx(idx + 1);
        } else {
          setStatus('finished');
        }
      }, delayMs);
      return () => { cancelled = true; clearTimeout(commitDelay); };
    }

    // Tool call/result dwell
    if (isTool) {
      const dwell = current.durationMs ?? 1200;
      const dwellTimer = setTimeout(() => {
        if (cancelled) return;
        setMessages(prev => [...prev, current]);
        if (idx + 1 < (script?.messages.length ?? 0)) {
          setIdx(idx + 1);
        } else {
          setStatus('finished');
        }
      }, dwell);
      return () => { cancelled = true; clearTimeout(dwellTimer); };
    }
  }, [status, typed, speed, delayMs, current, idx, script, layout, composerText]);

  const play = () => {
    if (!script) return;
    if (status === 'finished') {
      restart();
    } else {
      setStatus('playing');
    }
  };
  const pause = () => setStatus('paused');
  const restart = () => {
    setMessages([]);
    setTyped('');
    setIdx(0);
    setComposerText('');
    setStatus('playing');
  };
  const skip = () => {
    if (!script || !current) return;
    // Finish current instantly
    const isUser = current.role === 'user' && (!current.kind || current.kind === 'message');
    if (layout === 'liveScript' && isUser) {
      setComposerText(current.content ?? '');
      // Immediately commit
      setMessages(prev => [...prev, { ...current }]);
      setComposerText('');
      if (idx + 1 < (script.messages.length)) setIdx(idx + 1); else setStatus('finished');
      return;
    }
    if (!current.kind || current.kind === 'message') setTyped(current.content ?? '');
  };
  const next = () => {
    if (!script || !current) return;
    const isUser = current.role === 'user' && (!current.kind || current.kind === 'message');
    if (layout === 'liveScript' && isUser) {
      setMessages(prev => [...prev, { ...current, content: current.content ?? composerText }]);
      setComposerText('');
    } else {
      setMessages(prev => [...prev, current]);
      setTyped('');
    }
    if (idx + 1 < script.messages.length) setIdx(idx + 1); else setStatus('finished');
  };

  const header = (layout === 'classic' || layout === 'liveScript') && (
    layout === 'classic' ? (
      <div className="header">
        <span className="badge">Script Player</span>
        <span className="brand">{script?.title ?? 'Untitled Script'}</span>
        <div className="controls">
          {status !== 'playing' ? (
            <button onClick={play}>Play</button>
          ) : (
            <button onClick={pause}>Pause</button>
          )}
          <button onClick={restart}>Restart</button>
          <button onClick={skip} disabled={!current}>Skip typing</button>
          <button onClick={next} disabled={!current}>Next</button>
        </div>
      </div>
    ) : null
  );

  const footerClassic = layout === 'classic' && (
    <div className="footer">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label className="mono">Speed</label>
        <input
          type="range"
          min={5}
          max={80}
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
        />
        <span className="hint">{speed} cps</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label className="mono">Delay</label>
        <input
          type="range"
          min={0}
          max={2000}
          step={50}
          value={delayMs}
          onChange={(e) => setDelayMs(parseInt(e.target.value, 10))}
        />
        <span className="hint">{delayMs} ms</span>
      </div>
      <div className="spacer" />
      <span className="hint">{status.toUpperCase()}</span>
    </div>
  );

  const composerLive = layout === 'live' && (
    <div className="composer" style={{ paddingTop: 12 }}>
      <div className="composer-inner" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          <div style={{ fontSize: 13, opacity: 0.85 }} className="mono">
            {script?.title || 'Script'} • {status.toUpperCase()} {current ? `(${idx + (typed ? 1 : 0)}/${script?.messages.length})` : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} className="composer-controls">
            {status !== 'playing' ? (
              <button onClick={play}>Play</button>
            ) : (
              <button onClick={pause}>Pause</button>
            )}
            <button onClick={restart}>Restart</button>
            <button onClick={skip} disabled={!current || (current.kind && current.kind !== 'message')}>Skip Typing</button>
            <button onClick={next} disabled={!current}>Next</button>
            <label className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Speed
              <input
                type="range"
                min={5}
                max={80}
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
                style={{ width: 110 }}
              />
              <span className="hint">{speed}</span>
            </label>
            <label className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Delay
              <input
                type="range"
                min={0}
                max={2000}
                step={50}
                value={delayMs}
                onChange={(e) => setDelayMs(parseInt(e.target.value, 10))}
                style={{ width: 120 }}
              />
              <span className="hint">{delayMs}ms</span>
            </label>
          </div>
        </div>
      </div>
      <div className="composer-hint hint">Playback skin only – scripted conversation.</div>
    </div>
  );

  const composerScriptLive = layout === 'liveScript' && (
    <div className="composer" style={{ paddingTop: 12 }}>
      <div className="composer-inner" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 13, opacity: 0.85 }} className="mono">
            {script?.title || 'Script'} • {status.toUpperCase()} {current ? `(${idx + 1}/${script?.messages.length})` : ''}
          </div>
          <div
            style={{
              minHeight: 22,
              fontFamily: 'inherit',
              fontSize: 14,
              whiteSpace: 'pre-wrap',
              opacity: current?.role === 'user' ? 1 : 0.4,
            }}
            className="mono"
          >
            {current?.role === 'user' ? composerText : ''}
          </div>
        </div>
      </div>
      <div className="composer-hint hint">User messages are scripted; this input is a playback simulation.</div>
    </div>
  );

  // expose state outward each render when dependencies change
  useEffect(() => {
    if (!onState || !script) return;
    onState({
      status,
      speed,
      delayMs,
      idx,
      total: script?.messages.length || 0,
      isUserStaging: layout === 'liveScript' && current?.role === 'user',
    });
  }, [onState, status, speed, delayMs, idx, script, layout, current]);

  useImperativeHandle(ref, () => ({
    play,
    pause,
    restart,
    skip,
    next,
    setSpeed,
    setDelay: setDelayMs,
    getState: () => ({
      status,
      speed,
      delayMs,
      idx,
      total: script?.messages.length || 0,
      isUserStaging: layout === 'liveScript' && current?.role === 'user',
    }),
  }), [play, pause, restart, skip, next, speed, delayMs, idx, script, layout, current]);

  return (
    <div className="container">
      {header}
      <div className="chat" ref={containerRef}>
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {m.kind === 'tool_call' || m.kind === 'tool_result' ? (
                <ToolBubble item={m} />
              ) : (
                <ChatMessage role={m.role} text={m.content ?? ''} />
              )}
            </motion.div>
          ))}
          {current && status !== 'finished' && (
            current.kind === 'tool_call' || current.kind === 'tool_result' ? (
              <ToolBubble item={current} />
            ) : (
              <ChatMessage role={current.role} text={typed} />
            )
          )}
        </AnimatePresence>
      </div>
      {footerClassic}
  {composerLive}
  {composerScriptLive}
    </div>
  );
});

export default ChatPlayer;
