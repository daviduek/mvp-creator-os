'use client';

import { useState } from 'react';
import { usePoll } from '../lib/usePoll';
import { TabProps, uploadAsset } from './shared';
import FileUpload from './FileUpload';

interface FileState { file: File; preview: string; url?: string; }

export default function TabMotion(p: TabProps) {
  const [sourceMode, setSourceMode] = useState<'upload' | 'link'>('upload');
  const [video, setVideo] = useState<FileState | null>(null);
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [sashaImg, setSashaImg] = useState<FileState | null>(null);
  const poll = usePoll();

  const submit = async () => {
    if (sourceMode === 'upload' && !video) { p.setError('Subí el video de referencia.'); return; }
    if (sourceMode === 'link' && !tiktokUrl.trim()) { p.setError('Pegá el link.'); return; }
    if (!sashaImg) { p.setError('Subí una imagen de Sasha.'); return; }
    poll.stop();
    p.setError(''); p.setResultUrl(''); p.setLoading(true);
    p.setResultType('video');

    try {
      p.setStatusMsg('Subiendo imagen de Sasha...');
      const sashaUrl = sashaImg.url || await uploadAsset(sashaImg.file);
      setSashaImg({ ...sashaImg, url: sashaUrl });

      let refVideoUrl: string | undefined;
      let refTiktok: string | undefined;
      if (sourceMode === 'upload' && video) {
        p.setStatusMsg('Subiendo video de referencia...');
        refVideoUrl = video.url || await uploadAsset(video.file);
        setVideo({ ...video, url: refVideoUrl });
      } else {
        refTiktok = tiktokUrl.trim();
      }

      p.setStatusMsg('Encolando motion transfer...');
      const res = await fetch('/api/motion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sasha_image_url: sashaUrl, ref_video_url: refVideoUrl, tiktok_url: refTiktok }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      if (data.jobId) {
        p.setStatusMsg('Extrayendo movimiento y generando (4-8 min)...');
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
        <FileUpload value={sashaImg} onChange={setSashaImg} hint="Foto base de Sasha (cuerpo entero idealmente)" />
      </div>

      <div className="field">
        <label>Fuente del movimiento</label>
        <div className="row" style={{ marginBottom: 10 }}>
          <button
            className={sourceMode === 'upload' ? 'tab active' : 'tab'}
            onClick={() => setSourceMode('upload')}
            style={{ padding: '8px' }}
          >Subir video</button>
          <button
            className={sourceMode === 'link' ? 'tab active' : 'tab'}
            onClick={() => setSourceMode('link')}
            style={{ padding: '8px' }}
          >Link TikTok</button>
        </div>
        {sourceMode === 'upload' ? (
          <FileUpload value={video} onChange={setVideo} accept="video/*" isVideo hint="Subí el video del baile / movimiento" />
        ) : (
          <input
            type="text"
            placeholder="https://www.tiktok.com/@user/video/..."
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
          />
        )}
      </div>

      <button className="primary" onClick={submit} disabled={p.loading}>
        {p.loading ? 'Generando...' : 'Copiar movimiento a Sasha →'}
      </button>
    </div>
  );
}
