import React, { useEffect, useState } from 'react';
import ChatPlayer from './components/ChatPlayer';
import LiveChat from './components/LiveChat';
import type { ChatScript } from './types';
import { parseTextScript } from './utils/parseTextScript';

type Mode = 'script' | 'live';

export default function App() {
  const [script, setScript] = useState<ChatScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<string>('/scripts/demo.json');
  const [mode, setMode] = useState<Mode>('script');

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (!path) return;
    const isTxt = /\.txt(?:$|\?)/i.test(path);
    fetch(path)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
        return isTxt ? r.text() : r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (typeof data === 'string') {
          setScript(parseTextScript(data, path.split('/').pop() || 'Text Script'));
        } else {
          setScript(data as ChatScript);
        }
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [path]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        if (/\.json$/i.test(file.name)) {
          const data = JSON.parse(text);
          setScript(data);
        } else {
          setScript(parseTextScript(text, file.name));
        }
        setPath(file.name);
      } catch (err: any) {
        setError(err.message);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="header">
        <span className="brand">Chat Playground</span>
        <div className="controls">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            style={{ background: 'var(--glass-bg)', color: 'inherit', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}
          >
            <option value="script">Script Mode</option>
            <option value="live">Live Mode</option>
          </select>
          {mode === 'script' && (
            <>
              <label className="file-input">
                <input type="file" accept="application/json,text/plain" onChange={onPickFile} style={{ display: 'none' }} />
                <span>Load JSON…</span>
              </label>
              <input
                className="mono"
                style={{ width: 320 }}
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/scripts/demo.json"
              />
              <button onClick={() => setPath(path)}>Reload</button>
            </>
          )}
        </div>
      </div>
      {error && (
        <div style={{ color: '#ef4444', padding: 10, borderBottom: '1px solid #213155' }}>
          Error: {error}
        </div>
      )}
      <div style={{ flex: 1 }}>
        {mode === 'script' ? (
          <ChatPlayer script={script} />
        ) : (
          <LiveChat />
        )}
      </div>
    </div>
  );
}
