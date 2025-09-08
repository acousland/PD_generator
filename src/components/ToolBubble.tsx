import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../types';

interface Props {
  item: Message;
}

export default function ToolBubble({ item }: Props) {
  const isCall = item.kind === 'tool_call';
  const [progress, setProgress] = useState(0);
  const duration = Math.max(400, item.durationMs ?? 1200);

  useEffect(() => {
    if (!isCall) return;
    const start = performance.now();
    let raf = 0;
    const loop = (ts: number) => {
      const t = Math.min(1, (ts - start) / duration);
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isCall, duration]);

  return (
    <div className="row assistant">
      <motion.div
        className="bubble assistant mono"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{ width: 'min(780px, 90%)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className="badge">{isCall ? 'Tool call' : 'Tool result'}</span>
          <strong>{item.toolCall?.name || item.toolResult?.name}</strong>
        </div>
        {isCall ? (
          <div>
            {item.toolCall?.args && (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {typeof item.toolCall.args === 'string'
                  ? item.toolCall.args
                  : JSON.stringify(item.toolCall.args, null, 2)}
              </pre>
            )}
            <div style={{ marginTop: 8, height: 6, background: '#18233f', borderRadius: 999 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ ease: 'linear', duration: 0 }}
                style={{ height: '100%', background: '#60a5fa', borderRadius: 999 }}
              />
            </div>
          </div>
        ) : (
          <div>
            {item.toolResult?.summary && (
              <div style={{ marginBottom: 6 }}>{item.toolResult.summary}</div>
            )}
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{item.toolResult?.output}</pre>
          </div>
        )}
      </motion.div>
    </div>
  );
}
