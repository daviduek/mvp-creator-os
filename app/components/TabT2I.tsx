'use client';

import { useState } from 'react';
import { ASPECT_RATIOS } from '../lib/types';
import { usePoll } from '../lib/usePoll';
import { TabProps } from './shared';

export default function TabT2I(p: TabProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loraWeight, setLoraWeight] = useState(0.8);
  const poll = usePoll();

  const submit = async () => {
    if (!prompt.trim()) { p.setError('Escribí un prompt.'); return; }
    poll.stop();
    p.setError(''); p.setResultUrl(''); p.setLoading(true);
    p.setStatusMsg('Encolando...');
    p.setResultType('image');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspect_ratio: aspectRatio, lora_weight: loraWeight }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar');
      if (data.url) { p.setResultUrl(data.url); p.setLoading(false); p.setStatusMsg(''); return; }
      if (data.jobId) {
        p.setStatusMsg('Generando imagen...');
        poll.start(data.jobId,
          (url) => { p.setResultUrl(url); p.setLoading(false); p.setStatusMsg(''); },
          (err) => { p.setError(err); p.setLoading(false); p.setStatusMsg(''); },
          (msg) => p.setStatusMsg(msg),
        );
      }
    } catch (err: unknown) {
      p.setError(err instanceof Error ? err.message : 'Error desconocido');
      p.setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="field">
        <label>Prompt (Sasha + escenario)</label>
        <textarea
          placeholder="sashavan, luxury rooftop pool, white bikini, golden hour, photorealistic..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <p className="hint">El trigger word "sashavan" se agrega automáticamente si no lo incluís.</p>
      </div>
      <div className="row">
        <div className="field">
          <label>Aspect ratio</label>
          <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
            {ASPECT_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label>LoRA weight ({loraWeight.toFixed(2)})</label>
          <input
            type="range" min="0.4" max="1.2" step="0.05"
            value={loraWeight}
            onChange={(e) => setLoraWeight(Number(e.target.value))}
          />
          <p className="hint">+ alto = más Sasha · + bajo = más libertad</p>
        </div>
      </div>
      <button className="primary" onClick={submit} disabled={p.loading}>
        {p.loading ? 'Generando...' : 'Generar imagen →'}
      </button>
    </div>
  );
}
