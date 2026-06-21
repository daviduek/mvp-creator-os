'use client';

import { useRef, useState } from 'react';
import type { ContentMode } from './types';
import type { GenMode } from './providers/types';

interface GenResult {
  loading: boolean;
  statusMsg: string;
  error: string;
  resultUrl: string;
  resultKind: 'image' | 'video';
}

export function useGeneration() {
  const [state, setState] = useState<GenResult>({
    loading: false, statusMsg: '', error: '', resultUrl: '', resultKind: 'image',
  });
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => { if (pollRef.current) clearTimeout(pollRef.current); };

  const pollLoop = (jobId: string) => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/poll/${jobId}`);
        const data = await res.json();
        if (data.status === 'completed' && data.url) {
          setState((s) => ({ ...s, loading: false, statusMsg: '', resultUrl: data.url }));
          return;
        }
        if (data.status === 'failed') {
          const msg = typeof data.error === 'string' ? data.error : (data.error ? JSON.stringify(data.error) : 'Falló la generación');
          setState((s) => ({ ...s, loading: false, statusMsg: '', error: msg }));
          return;
        }
        const msg = data.status === 'processing'
          ? (data.progress ? `Procesando... ${data.progress}%` : 'Procesando...')
          : 'En cola...';
        setState((s) => ({ ...s, statusMsg: msg }));
        pollRef.current = setTimeout(tick, 3000);
      } catch {
        pollRef.current = setTimeout(tick, 4000);
      }
    };
    tick();
  };

  const generate = async (
    mode: GenMode,
    content: ContentMode,
    kind: 'image' | 'video',
    payload: Record<string, unknown>,
  ) => {
    stop();
    setState({ loading: true, statusMsg: 'Enviando...', error: '', resultUrl: '', resultKind: kind });
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, content, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error) || 'Error al generar');
      if (data.url) {
        setState((s) => ({ ...s, loading: false, statusMsg: '', resultUrl: data.url }));
        return;
      }
      if (data.jobId) {
        setState((s) => ({ ...s, statusMsg: 'En cola...' }));
        pollLoop(data.jobId);
        return;
      }
      throw new Error('Respuesta inesperada del servidor');
    } catch (err: unknown) {
      setState((s) => ({ ...s, loading: false, statusMsg: '', error: err instanceof Error ? err.message : 'Error' }));
    }
  };

  return { ...state, generate, stop };
}
