import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatScript, Message } from '../types';
import ChatMessage from './ChatMessage';
import ToolBubble from './ToolBubble';

type Status = 'idle' | 'playing' | 'paused' | 'finished' | 'error';

interface Props {
  script?: ChatScript | null;
  defaultTypingSpeed?: number; // chars per second
  defaultDelayMs?: number;
  layout?: 'classic' | 'live';
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

export default function ChatPlayer({ script, defaultTypingSpeed = 35, defaultDelayMs = 500, layout = 'classic' }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typed, setTyped] = useState('');
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

  // Playback typing loop for normal messages, timed step for tool items
  useEffect(() => {
    if (!script || !current) return;
    if (status !== 'playing') return;

    let cancelled = false;
    if (!current.kind || current.kind === 'message') {
      const content = current.content ?? '';
      const cps = Math.max(1, speed);
      const interval = 1000 / cps;

      if (typed.length < content.length) {
        const t = setTimeout(() => {
          if (!cancelled) setTyped(content.slice(0, typed.length + 1));
        }, interval);
        return () => {
          cancelled = true;
          clearTimeout(t);
        };
      }
    }

    const dwell = current.kind && current.kind !== 'message' ? (current.durationMs ?? 1200) : delayMs;
    const t2 = setTimeout(() => {
      if (cancelled) return;
      setMessages((prev: Message[]) => [...prev, current]);
      setTyped('');
      if (idx + 1 < (script?.messages.length ?? 0)) {
        setIdx(idx + 1);
      } else {
        setStatus('finished');
      }
    }, dwell);

    return () => {
      cancelled = true;
      clearTimeout(t2);
    };
  }, [status, typed, speed, delayMs, current, idx, script]);

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
    setStatus('playing');
  };
  const skip = () => {
    if (!script || !current) return;
    // Finish current instantly
    if (!current.kind || current.kind === 'message') {
      setTyped(current.content ?? '');
    } else {
      setTyped('');
    }
  };
  const next = () => {
    if (!script || !current) return;
    setMessages(prev => [...prev, current]);
    setTyped('');
    if (idx + 1 < script.messages.length) {
      setIdx(idx + 1);
    } else {
      setStatus('finished');
    }
  };

  const header = layout === 'classic' && (
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
    </div>
  );
}
