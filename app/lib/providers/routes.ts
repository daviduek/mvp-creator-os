/**
 * Static routing table — safe to import from client components (no secrets).
 *
 * Maps every (mode, content) pair to a provider + human-facing metadata.
 * The actual model id is resolved server-side in router.ts from env vars so
 * you can swap models without a code change.
 */
import type { GenMode, ContentMode, ProviderName, ResultKind } from './types';

export interface RouteInfo {
  provider: ProviderName;
  kind: ResultKind;
  label: string;       // model shown in UI
  estCost: string;     // per generation
  estTime: string;     // wall-clock estimate
  enabled: boolean;    // false → "próximamente" in UI
  note?: string;
}

export const ROUTE_INFO: Record<string, RouteInfo> = {
  // ---- Imagen ----
  't2i:sfw': {
    provider: 'fal', kind: 'image',
    label: 'Imagen 4 Ultra', estCost: '~$0.06', estTime: '~10s', enabled: true,
  },
  't2i:nsfw': {
    provider: 'replicate', kind: 'image',
    label: 'Flux Lustify', estCost: '~$0.06', estTime: '~15s', enabled: true,
  },

  // ---- Texto → Video ----
  't2v:sfw': {
    provider: 'fal', kind: 'video',
    label: 'Veo 3', estCost: '~$2-4', estTime: '~60-120s', enabled: true,
  },
  't2v:nsfw': {
    provider: 'runpod', kind: 'video',
    label: 'Wan 2.2 NSFW (infra propia)', estCost: '~$0.10', estTime: '~3-5min', enabled: false,
    note: 'Requiere build del worker de video NSFW',
  },

  // ---- Imagen → Video (animar) ----
  'i2v:sfw': {
    provider: 'fal', kind: 'video',
    label: 'Veo 3 (image-to-video)', estCost: '~$2-4', estTime: '~60-120s', enabled: true,
  },
  'i2v:nsfw': {
    provider: 'runpod', kind: 'video',
    label: 'Wan 2.2 I2V NSFW (infra propia)', estCost: '~$0.06', estTime: '~3-5min', enabled: false,
    note: 'Requiere build del worker de video NSFW',
  },

  // ---- Motion copy ----
  'motion:sfw': {
    provider: 'fal', kind: 'video',
    label: 'Runway Gen-4 (act/motion)', estCost: '~$0.75', estTime: '~60s', enabled: true,
  },
  'motion:nsfw': {
    provider: 'runpod', kind: 'video',
    label: 'MimicMotion + Wan 2.2 (infra propia)', estCost: '~$0.04', estTime: '~4-8min', enabled: false,
    note: 'Requiere build del worker de motion NSFW',
  },

  // ---- NSFW edit (img2img sobre imagen ya generada de Sasha) ----
  'edit:nsfw': {
    provider: 'runpod', kind: 'image',
    label: 'CR Pony img2img + IP-Adapter (infra propia)', estCost: '~$0.03', estTime: '~40s', enabled: true,
  },
  'edit:sfw': {
    provider: 'runpod', kind: 'image',
    label: 'CR Pony img2img + IP-Adapter (infra propia)', estCost: '~$0.03', estTime: '~40s', enabled: true,
  },

  // ---- Pose copy ----
  'pose:sfw': {
    provider: 'fal', kind: 'image',
    label: 'Imagen 4 Ultra + pose ref', estCost: '~$0.06', estTime: '~12s', enabled: false,
    note: 'fal no expone ControlNet pose directo; se hará vía infra propia',
  },
  'pose:nsfw': {
    provider: 'runpod', kind: 'image',
    label: 'CR Pony + ControlNet OpenPose (infra propia)', estCost: '~$0.02', estTime: '~30s', enabled: true,
  },
};

export function routeKey(mode: GenMode, content: ContentMode): string {
  return `${mode}:${content}`;
}

export function getRouteInfo(mode: GenMode, content: ContentMode): RouteInfo | undefined {
  return ROUTE_INFO[routeKey(mode, content)];
}
