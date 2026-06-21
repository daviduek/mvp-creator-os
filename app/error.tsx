'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[app error boundary]', error);
  }, [error]);

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', color: '#fca5a5', maxWidth: 900, margin: '40px auto' }}>
      <h2 style={{ color: '#fff', marginBottom: 12 }}>⚠️ Error capturado (no es crash del navegador)</h2>
      <p style={{ color: '#94a3b8', marginBottom: 16 }}>
        Copiá este texto y pasámelo — es la causa real:
      </p>
      <pre style={{
        background: '#1a0a0a', border: '1px solid #450a0a', borderRadius: 8,
        padding: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13,
      }}>
        {error?.name}: {error?.message}
        {error?.digest ? `\n\ndigest: ${error.digest}` : ''}
        {error?.stack ? `\n\n${error.stack}` : ''}
      </pre>
      <button
        onClick={reset}
        style={{
          marginTop: 16, background: '#6366f1', color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer',
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
