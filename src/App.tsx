import React, { useEffect, useState } from 'react';
import ChatPlayer, { ChatPlayerHandle, PlayerStateSnapshot } from './components/ChatPlayer';
import type { ChatScript } from './types';
import { parseTextScript } from './utils/parseTextScript';

export default function App() {
  const [script, setScript] = useState<ChatScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<string>('/scripts/demo.json');
  const playerRef = React.useRef<ChatPlayerHandle | null>(null);
  const [playerState, setPlayerState] = useState<PlayerStateSnapshot | null>(null);

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
        <span className="brand">Scripted Live Chat</span>
        <div className="controls" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {playerState?.status !== 'playing' ? (
              <button onClick={() => playerRef.current?.play()}>Play</button>
            ) : (
              <button onClick={() => playerRef.current?.pause()}>Pause</button>
            )}
            <button onClick={() => playerRef.current?.restart()}>Restart</button>
            <button onClick={() => playerRef.current?.skip()} disabled={!playerState}>Skip</button>
            <button onClick={() => playerRef.current?.next()} disabled={!playerState}>Next</button>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingLeft: 12 }}>
            <label className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Speed
              <input
                type="range"
                min={5}
                max={80}
                value={playerState?.speed ?? 35}
                onChange={(e) => playerRef.current?.setSpeed(parseInt(e.target.value, 10))}
                style={{ width: 90 }}
              />
              <span className="hint">{playerState?.speed}</span>
            </label>
            <label className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Delay
              <input
                type="range"
                min={0}
                max={2000}
                step={50}
                value={playerState?.delayMs ?? 500}
                onChange={(e) => playerRef.current?.setDelay(parseInt(e.target.value, 10))}
                style={{ width: 100 }}
              />
              <span className="hint">{playerState?.delayMs}ms</span>
            </label>
            <span className="hint mono" style={{ paddingLeft: 4 }}>
              {playerState ? `${playerState.status.toUpperCase()} ${playerState.idx + 1}/${playerState.total}` : 'IDLE'}
            </span>
          </div>
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
        </div>
      </div>
      {error && (
        <div style={{ color: '#ef4444', padding: 10, borderBottom: '1px solid #213155' }}>
          Error: {error}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <ChatPlayer
          ref={playerRef}
          script={script}
          layout="liveScript"
          onState={setPlayerState}
        />
      </div>
    </div>
  );
}
