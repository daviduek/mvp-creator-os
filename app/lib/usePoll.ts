'use client';

import { useRef } from 'react';

export function usePoll() {
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = (jobId: string, onResult: (url: string) => void, onError: (err: string) => void, onProgress?: (msg: string) => void) => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/poll/${jobId}`);
        const data = await res.json();
        if (data.status === 'completed' && data.url) { onResult(data.url); return; }
        if (data.status === 'failed') { onError(data.error || 'La generación falló'); return; }
        if (data.progress && onProgress) onProgress(`Procesando... ${data.progress}%`);
        ref.current = setTimeout(tick, 3000);
      } catch {
        ref.current = setTimeout(tick, 4000);
      }
    };
    tick();
  };

  const stop = () => { if (ref.current) clearTimeout(ref.current); };

  return { start, stop };
}
