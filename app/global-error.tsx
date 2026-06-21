'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ background: '#0a0a0f', color: '#fca5a5', fontFamily: 'monospace', margin: 0 }}>
        <div style={{ padding: 24, maxWidth: 900, margin: '40px auto' }}>
          <h2 style={{ color: '#fff' }}>⚠️ Error global capturado</h2>
          <p style={{ color: '#94a3b8' }}>Copiá esto y pasámelo:</p>
          <pre style={{
            background: '#1a0a0a', border: '1px solid #450a0a', borderRadius: 8,
            padding: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13,
          }}>
            {error?.name}: {error?.message}
            {error?.digest ? `\n\ndigest: ${error.digest}` : ''}
            {error?.stack ? `\n\n${error.stack}` : ''}
          </pre>
          <button onClick={reset} style={{
            marginTop: 16, background: '#6366f1', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer',
          }}>Reintentar</button>
        </div>
      </body>
    </html>
  );
}
