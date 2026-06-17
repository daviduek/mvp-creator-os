'use client';

import { useState } from 'react';
import { usePoll } from '../lib/usePoll';
import { TabProps, uploadAsset } from './shared';
import FileUpload from './FileUpload';

interface FileState { file: File; preview: string; url?: string; }

export default function TabPose(p: TabProps) {
  const [poseImg, setPoseImg] = useState<FileState | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loraWeight, setLoraWeight] = useState(0.85);
  const poll = usePoll();

  const submit = async () => {
    if (!poseImg) { p.setError('Subí una foto con la pose de referencia.'); return; }
    poll.stop();
    p.setError(''); p.setResultUrl(''); p.setLoading(true);
    p.setResultType('image');

    try {
      p.setStatusMsg('Subiendo pose de referencia...');
      const poseUrl = poseImg.url || await uploadAsset(poseImg.file);
      setPoseImg({ ...poseImg, url: poseUrl });

      p.setStatusMsg('Extrayendo esqueleto y generando...');
      const res = await fetch('/api/pose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pose_image_url: poseUrl, prompt, lora_weight: loraWeight }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      if (data.url) { p.setResultUrl(data.url); p.setLoading(false); p.setStatusMsg(''); return; }
      if (data.jobId) {
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
        <label>Foto de la pose a copiar</label>
        <FileUpload value={poseImg} onChange={setPoseImg} hint="Subí una foto con la pose que querés que adopte Sasha" />
      </div>
      <div className="field">
        <label>Prompt de contexto (opcional)</label>
        <textarea
          placeholder="luxury rooftop, white bikini, golden hour..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{ minHeight: 70 }}
        />
      </div>
      <div className="field">
        <label>LoRA weight ({loraWeight.toFixed(2)})</label>
        <input
          type="range" min="0.5" max="1.1" step="0.05"
          value={loraWeight}
          onChange={(e) => setLoraWeight(Number(e.target.value))}
        />
      </div>
      <button className="primary" onClick={submit} disabled={p.loading}>
        {p.loading ? 'Generando...' : 'Aplicar pose a Sasha →'}
      </button>
    </div>
  );
}
