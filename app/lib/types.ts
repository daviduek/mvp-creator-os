export type Tab = 't2i' | 'i2v' | 't2v' | 'motion' | 'pose';
export type ContentMode = 'sfw' | 'nsfw';

export const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 't2i', label: 'Imagen', desc: 'Texto → Imagen' },
  { id: 'i2v', label: 'Animar', desc: 'Imagen → Video' },
  { id: 't2v', label: 'Video', desc: 'Texto → Video' },
  { id: 'motion', label: 'Motion', desc: 'Copiar movimiento' },
  { id: 'pose', label: 'Pose', desc: 'Copiar pose' },
];

// Which inputs each mode needs
export const MODE_NEEDS: Record<Tab, {
  prompt: boolean;
  image: boolean;        // upload a Sasha image
  endImage: boolean;     // optional end frame (i2v chaining)
  refVideo: boolean;     // motion reference
  poseImage: boolean;    // pose reference
  aspect: boolean;
  duration: boolean;
  loraWeight: boolean;
}> = {
  t2i:    { prompt: true,  image: false, endImage: false, refVideo: false, poseImage: false, aspect: true,  duration: false, loraWeight: true },
  i2v:    { prompt: true,  image: true,  endImage: true,  refVideo: false, poseImage: false, aspect: true,  duration: true,  loraWeight: false },
  t2v:    { prompt: true,  image: false, endImage: false, refVideo: false, poseImage: false, aspect: true,  duration: true,  loraWeight: false },
  motion: { prompt: false, image: true,  endImage: false, refVideo: true,  poseImage: false, aspect: false, duration: false, loraWeight: false },
  pose:   { prompt: true,  image: false, endImage: false, refVideo: false, poseImage: true,  aspect: true,  duration: false, loraWeight: true },
};

export const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];
export const VIDEO_DURATIONS = [4, 6, 8]; // Veo 3 only accepts 4s / 6s / 8s
