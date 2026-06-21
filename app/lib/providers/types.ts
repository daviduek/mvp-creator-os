/**
 * Shared provider types. The whole app speaks this language; each provider
 * client (fal, replicate, runpod) adapts it to its own API shape.
 */

export type ContentMode = 'sfw' | 'nsfw';
export type GenMode = 't2i' | 'i2v' | 't2v' | 'motion' | 'pose' | 'edit';
export type ProviderName = 'fal' | 'replicate' | 'runpod';

/** A normalized generation request coming from the UI. */
export interface GenRequest {
  mode: GenMode;
  content: ContentMode;
  prompt?: string;
  aspect_ratio?: string;     // '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  duration?: number;         // seconds, for video
  resolution?: string;       // '480p' | '720p' | '1080p'
  image_url?: string;        // for i2v / motion / pose (the Sasha image / start frame)
  end_image_url?: string;    // optional end frame for i2v (chaining sequences)
  ref_video_url?: string;    // for motion (the reference dance/movement)
  tiktok_url?: string;       // for motion (download via yt-dlp on worker)
  lora_weight?: number;      // only relevant for self-hosted runpod
  denoise?: number;          // img2img strength for 'edit' mode (0.4 keep / 0.8 change a lot)
  seed?: number;
}

/** What submit() returns: either an immediate URL or an opaque job token to poll. */
export interface SubmitResult {
  url?: string;              // resolved synchronously
  jobId?: string;            // opaque base64url token; pass to /api/poll/[jobId]
}

/** What poll() returns. */
export interface PollResult {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  url?: string;
  progress?: number;
  error?: string;
}

/** The result kind, so the UI knows whether to render <img> or <video>. */
export type ResultKind = 'image' | 'video';

/** A route maps a (mode, content) pair to a concrete provider + model. */
export interface Route {
  provider: ProviderName;
  model?: string;            // provider model id (fal/replicate). Unused for runpod.
  kind: ResultKind;
  label: string;             // human label shown in the UI, e.g. "Imagen 4 Ultra"
  estCost: string;           // human cost estimate, e.g. "~$0.06"
  estTime: string;           // human time estimate, e.g. "~10s"
  enabled: boolean;          // false → graceful "coming soon" message
}
