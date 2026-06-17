'use client';

interface Props {
  resultUrl: string;
  resultType: 'image' | 'video';
  loading: boolean;
  statusMsg: string;
  error: string;
}

export default function ResultPanel({ resultUrl, resultType, loading, statusMsg, error }: Props) {
  return (
    <div className="card">
      <label>Resultado</label>
      {loading && (
        <div className="status">
          <div className="spinner" />
          {statusMsg}
        </div>
      )}
      {error && <div className="error-box">{error}</div>}
      {resultUrl ? (
        <div style={{ textAlign: 'center' }}>
          {resultType === 'video' ? (
            <video src={resultUrl} controls autoPlay loop style={{ maxWidth: '100%', borderRadius: 10 }} />
          ) : (
            <img src={resultUrl} alt="resultado" style={{ maxWidth: '100%', borderRadius: 10 }} />
          )}
          <br />
          <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="download-btn">
            {resultType === 'video' ? 'Descargar video ↗' : 'Ver tamaño completo ↗'}
          </a>
        </div>
      ) : !loading && !error ? (
        <div className="result-area">
          <span>El resultado aparecerá aquí</span>
        </div>
      ) : null}
    </div>
  );
}
