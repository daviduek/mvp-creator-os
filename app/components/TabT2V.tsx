'use client';

import { useState } from 'react';
import { VIDEO_DURATIONS } from '../lib/types';
import { usePoll } from '../lib/usePoll';
import { TabProps } from './shared';

export default function TabT2V(p: TabProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const poll = usePoll();

  const submit = async () => {
    if (!prompt.trim()) { p.setError('Escribí un prompt.'); return; }
    poll.stop();
    p.setError(''); p.setResultUrl(''); p.setLoading(true);
    p.setResultType('video');
    p.setStatusMsg('Encolando...');

    try {
      const res = await fetch('/api/t2v', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar');
      if (data.jobId) {
        p.setStatusMsg('Generando video desde texto (3-6 min)...');
        poll.start(data.jobId,
          (url) => { p.setResultUrl(url); p.setLoading(false); p.setStatusMsg(''); },
          (err) => { p.setError(err); p.setLoading(false); p.setStatusMsg(''); },
          (msg) => p.setStatusMsg(msg),
        );
      }
    } catch (err: unknown) {
      p.setError(err instanceof Error ? err.message : 'Error');
      p.setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="field">
        <label>Prompt</label>
        <textarea
          placeholder="sashavan walking on miami beach at sunset, slow camera dolly, cinematic..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Duración</label>
        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          {VIDEO_DURATIONS.map((d) => <option key={d} value={d}>{d}s</option>)}
        </select>
      </div>
      <button className="primary" onClick={submit} disabled={p.loading}>
        {p.loading ? 'Generando...' : 'Generar video →'}
      </button>
    </div>
  );
}
