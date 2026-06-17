export type Tab = 't2i' | 'i2v' | 't2v' | 'motion' | 'pose';

export const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 't2i', label: 'Imagen', desc: 'Texto → Imagen con LoRA' },
  { id: 'i2v', label: 'Animar', desc: 'Imagen → Video corto' },
  { id: 't2v', label: 'Video T2V', desc: 'Texto → Video con LoRA' },
  { id: 'motion', label: 'Motion', desc: 'Copiar movimiento de video' },
  { id: 'pose', label: 'Pose', desc: 'Copiar pose de foto' },
];

export const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];
export const VIDEO_DURATIONS = [3, 5, 8];
export const VIDEO_RESOLUTIONS = ['480p', '720p'];

export interface JobResponse {
  jobId?: string;
  url?: string;
  error?: string;
}

export interface PollResponse {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  url?: string;
  progress?: number;
  error?: string;
}
