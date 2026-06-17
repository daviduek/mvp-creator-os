'use client';

interface FileState { file: File; preview: string; url?: string; }

interface Props {
  value: FileState | null;
  onChange: (v: FileState | null) => void;
  accept?: string;
  hint?: string;
  isVideo?: boolean;
}

export default function FileUpload({ value, onChange, accept = 'image/*', hint, isVideo }: Props) {
  if (value) {
    return (
      <div className="preview">
        {isVideo ? (
          <video src={value.preview} controls style={{ maxHeight: 180, borderRadius: 6 }} />
        ) : (
          <img src={value.preview} alt="preview" />
        )}
        <br />
        <button className="remove" onClick={() => onChange(null)}>Quitar</button>
      </div>
    );
  }
  return (
    <div className="upload-zone">
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange({ file: f, preview: URL.createObjectURL(f) });
        }}
      />
      <p>{hint || 'Click para subir'}</p>
    </div>
  );
}
