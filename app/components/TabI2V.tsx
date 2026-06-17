'use client';

import { useState } from 'react';
import { VIDEO_DURATIONS, VIDEO_RESOLUTIONS } from '../lib/types';
import { usePoll } from '../lib/usePoll';
import { TabProps, uploadAsset } from './shared';
import FileUpload from './FileUpload';

interface FileState { file: File; preview: string; url?: string; }

export default function TabI2V(p: TabProps) {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<FileState | null>(null);
  const [resolution, setResolution] = useState('480p');
  const [duration, setDuration] = useState(5);
  const poll = usePoll();

  const submit = async () => {
    if (!image) { p.setError('Subí una imagen de Sasha.'); return; }
    poll.stop();
    p.setError(''); p.setResultUrl(''); p.setLoading(true);
    p.setResultType('video');

    try {
      p.setStatusMsg('Subiendo imagen...');
      const imgUrl = image.url || await uploadAsset(image.file);
      setImage({ ...image, url: imgUrl });

      p.setStatusMsg('Encolando video...');
      const res = await fetch('/api/i2v', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imgUrl, prompt, resolution, duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar');
      if (data.jobId) {
        p.setStatusMsg('Generando video (puede tardar 2-4 min)...');
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
        <label>Imagen de Sasha</label>
        <FileUpload value={image} onChange={setImage} hint="Subí una imagen generada de Sasha para animar" />
      </div>
      <div className="field">
        <label>Prompt de movimiento (opcional)</label>
        <textarea
          placeholder="gentle swaying motion, cinematic slow push-in, smiling at camera..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{ minHeight: 70 }}
        />
      </div>
      <div className="row">
        <div className="field">
          <label>Resolución</label>
          <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
            {VIDEO_RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Duración</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {VIDEO_DURATIONS.map((d) => <option key={d} value={d}>{d}s</option>)}
          </select>
        </div>
      </div>
      <button className="primary" onClick={submit} disabled={p.loading}>
        {p.loading ? 'Generando...' : 'Animar imagen →'}
      </button>
    </div>
  );
}
