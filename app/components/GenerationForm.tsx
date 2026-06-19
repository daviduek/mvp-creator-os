'use client';

import { useState, useEffect } from 'react';
import { Tab, ContentMode, MODE_NEEDS, ASPECT_RATIOS, VIDEO_DURATIONS } from '../lib/types';
import { ROUTE_INFO, routeKey } from '../lib/providers/routes';
import { useGeneration } from '../lib/useGeneration';
import { uploadAsset } from './shared';
import FileUpload from './FileUpload';

interface FileState { file: File; preview: string; url?: string; }

export default function GenerationForm({ mode }: { mode: Tab }) {
  const needs = MODE_NEEDS[mode];
  const gen = useGeneration();

  const [content, setContent] = useState<ContentMode>('sfw');
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState(mode === 'motion' ? '9:16' : '1:1');
  const [duration, setDuration] = useState(5);
  const [loraWeight, setLoraWeight] = useState(0.85);
  const [image, setImage] = useState<FileState | null>(null);
  const [poseImage, setPoseImage] = useState<FileState | null>(null);
  const [refVideo, setRefVideo] = useState<FileState | null>(null);
  const [sourceMode, setSourceMode] = useState<'upload' | 'link'>('upload');
  const [tiktokUrl, setTiktokUrl] = useState('');

  const route = ROUTE_INFO[routeKey(mode, content)];

  useEffect(() => () => gen.stop(), []); // cleanup on unmount

  const submit = async () => {
    if (needs.prompt && !prompt.trim()) { return; }
    const kind = route?.kind || 'image';
    const payload: Record<string, unknown> = { prompt };
    if (needs.aspect) payload.aspect_ratio = aspect;
    if (needs.duration) payload.duration = duration;
    if (needs.loraWeight) payload.lora_weight = loraWeight;

    try {
      if (needs.image && image) {
        payload.image_url = image.url || await uploadAsset(image.file);
      }
      if (needs.poseImage && poseImage) {
        payload.image_url = poseImage.url || await uploadAsset(poseImage.file);
      }
      if (needs.refVideo) {
        if (sourceMode === 'link') payload.tiktok_url = tiktokUrl.trim();
        else if (refVideo) payload.ref_video_url = refVideo.url || await uploadAsset(refVideo.file);
      }
    } catch {
      // uploadAsset throws are surfaced by the generate error path; fall through
    }

    gen.generate(mode, content, kind, payload);
  };

  const disabled = gen.loading || (route ? !route.enabled : true);

  return (
    <div>
      {/* SFW / NSFW toggle */}
      <div className="card">
        <label>Tipo de contenido</label>
        <div className="content-toggle">
          <button className={content === 'sfw' ? 'ct on' : 'ct'} onClick={() => setContent('sfw')}>
            SFW · Público
          </button>
          <button className={content === 'nsfw' ? 'ct on nsfw' : 'ct'} onClick={() => setContent('nsfw')}>
            NSFW · Explícito
          </button>
        </div>

        {/* Active model badge */}
        {route && (
          <div className={route.enabled ? 'model-badge' : 'model-badge off'}>
            <span className="mb-name">{route.label}</span>
            <span className="mb-meta">{route.estTime} · {route.estCost}</span>
            {!route.enabled && <span className="mb-soon">próximamente{route.note ? ` — ${route.note}` : ''}</span>}
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="card">
        {needs.prompt && (
          <div className="field">
            <label>Prompt</label>
            <textarea
              placeholder="sashavan, luxury rooftop, golden hour, photorealistic..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
        )}

        {needs.image && (
          <div className="field">
            <label>Imagen de Sasha</label>
            <FileUpload value={image} onChange={setImage} hint="Subí una imagen de Sasha para animar" />
          </div>
        )}

        {needs.poseImage && (
          <div className="field">
            <label>Foto con la pose a copiar</label>
            <FileUpload value={poseImage} onChange={setPoseImage} hint="Subí la foto de la pose de referencia" />
          </div>
        )}

        {needs.refVideo && (
          <div className="field">
            <label>Fuente del movimiento</label>
            <div className="content-toggle" style={{ marginBottom: 10 }}>
              <button className={sourceMode === 'upload' ? 'ct on' : 'ct'} onClick={() => setSourceMode('upload')}>Subir video</button>
              <button className={sourceMode === 'link' ? 'ct on' : 'ct'} onClick={() => setSourceMode('link')}>Link TikTok</button>
            </div>
            {sourceMode === 'upload'
              ? <FileUpload value={refVideo} onChange={setRefVideo} accept="video/*" isVideo hint="Subí el video del movimiento/baile" />
              : <input type="text" placeholder="https://www.tiktok.com/@.../video/..." value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} />}
          </div>
        )}

        <div className="row">
          {needs.aspect && (
            <div className="field">
              <label>Aspect ratio</label>
              <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
                {ASPECT_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
          {needs.duration && (
            <div className="field">
              <label>Duración</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {VIDEO_DURATIONS.map((d) => <option key={d} value={d}>{d}s</option>)}
              </select>
            </div>
          )}
          {needs.loraWeight && (
            <div className="field">
              <label>Fidelidad ({loraWeight.toFixed(2)})</label>
              <input type="range" min="0.5" max="1.0" step="0.05" value={loraWeight} onChange={(e) => setLoraWeight(Number(e.target.value))} />
            </div>
          )}
        </div>

        <button className="primary" onClick={submit} disabled={disabled}>
          {gen.loading ? 'Generando...' : route?.enabled ? `Generar ${route.kind === 'video' ? 'video' : 'imagen'} →` : 'No disponible'}
        </button>
      </div>

      {/* Result */}
      <div className="card">
        <label>Resultado</label>
        {gen.loading && <div className="status"><div className="spinner" />{gen.statusMsg}</div>}
        {gen.error && <div className="error-box">{gen.error}</div>}
        {gen.resultUrl ? (
          <div style={{ textAlign: 'center' }}>
            {gen.resultKind === 'video'
              ? <video src={gen.resultUrl} controls autoPlay loop style={{ maxWidth: '100%', borderRadius: 10 }} />
              : <img src={gen.resultUrl} alt="resultado" style={{ maxWidth: '100%', borderRadius: 10 }} />}
            <br />
            <a href={gen.resultUrl} target="_blank" rel="noopener noreferrer" className="download-btn">
              {gen.resultKind === 'video' ? 'Descargar video ↗' : 'Ver tamaño completo ↗'}
            </a>
          </div>
        ) : !gen.loading && !gen.error ? (
          <div className="result-area"><span>El resultado aparecerá aquí</span></div>
        ) : null}
      </div>
    </div>
  );
}
