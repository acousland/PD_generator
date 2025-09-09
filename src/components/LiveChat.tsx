import React, { useCallback, useEffect, useRef, useState } from 'react';
import ChatMessage from './ChatMessage';
import type { Message } from '../types';

interface Props {
  initialSystemMessage?: string;
  typingSpeed?: number; // chars per second
}

export default function LiveChat({ initialSystemMessage = 'You are drafting a Position Description. Ask me about responsibilities, scope, and requirements.', typingSpeed = 40 }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => [
    { role: 'assistant', content: initialSystemMessage }
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'thinking' | 'typing'>('idle');
  const [pending, setPending] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return; el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  // Typing animation for assistant reply
  useEffect(() => {
    if (status !== 'typing') return;
    if (!target) return;
    if (pending.length >= target.length) {
      // Commit
      setMessages(prev => [...prev, { role: 'assistant', content: target }]);
      setPending('');
      setTarget('');
      setStatus('idle');
      return;
    }
    const cps = Math.max(5, typingSpeed);
    const interval = 1000 / cps;
    const t = setTimeout(() => setPending(target.slice(0, pending.length + 1)), interval);
    return () => clearTimeout(t);
  }, [status, pending, target, typingSpeed]);

  const generateAssistant = useCallback((userText: string) => {
    // Very simple heuristic mock response.
    const trimmed = userText.trim();
    // Provide a pseudo AI style reply referencing user message.
    const reply = `Got it. Key points I captured:\n${summarize(trimmed)}\n\nIf you want, provide more detail on scope, stakeholders, or success metrics.`;
    setStatus('typing');
    setTarget(reply);
    setPending('');
  }, []);

  const onSend = () => {
    if (!input.trim() || status === 'thinking' || status === 'typing') return;
    const userText = input;
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInput('');
    setStatus('thinking');
    // Small artificial thinking delay
    setTimeout(() => generateAssistant(userText), 450 + Math.random() * 400);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="container">
      <div className="header">
        <span className="badge">Live Chat</span>
        <span className="brand">Interactive Mode</span>
      </div>
      <div className="chat" ref={scrollRef}>
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} text={m.content ?? ''} />
        ))}
        {status === 'thinking' && (
          <ChatMessage role="assistant" text={'…'} />
        )}
        {status === 'typing' && (
          <ChatMessage role="assistant" text={pending} />
        )}
      </div>
      <div className="composer">
        <div className="composer-inner">
          <textarea
            placeholder="Message... (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
          />
          <div className="composer-actions">
            <button disabled={!input.trim() || status === 'typing' || status === 'thinking'} onClick={onSend}>Send</button>
          </div>
        </div>
        <div className="composer-hint hint">Prototype only – responses are locally generated echoes.</div>
      </div>
    </div>
  );
}

function summarize(text: string): string {
  // naive summarization: split into sentences or bullet-like items; limit length
  const lines = text.split(/\n+/).filter(Boolean);
  const first = lines[0] || text;
  if (first.length > 180) return first.slice(0, 170) + '…';
  if (lines.length > 1) return lines.slice(0, 3).join('\n');
  // create simple bullet tokens from comma separation
  if (/,/.test(first)) {
    return first.split(/\s*,\s*/).slice(0, 4).map(p => '• ' + p).join('\n');
  }
  return first;
}
