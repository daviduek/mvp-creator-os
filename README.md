# MVP Creator OS

Studio de generación AI con avatar consistente. Base reutilizable para el proyecto Creator OS completo.

## Stack
- Next.js 15 (App Router) + TypeScript
- Cloudflare R2 (storage de outputs)
- RunPod Serverless (ComfyUI workers)

## Modos
1. **T2I** — Texto → Imagen con LoRA del personaje
2. **I2V** — Imagen → Video (Wan2.1)
3. **T2V** — Texto → Video con LoRA (HunyuanVideo)
4. **Motion** — Copiar movimiento de video/TikTok (MimicMotion + DWPose)
5. **Pose** — Copiar pose de foto (ControlNet OpenPose)

## Setup local
```bash
npm install
cp .env.example .env.local
# editar .env.local con keys
npm run dev
```

## Variables de entorno
Ver `.env.example`. Necesitás:
- RunPod Serverless endpoint deployado con custom handler de ComfyUI
- Bucket R2 con CORS habilitado
- LoRA `sashavan.safetensors` accesible vía URL (en R2 público)

## Worker de RunPod
El endpoint Serverless espera workflows con shape:
```json
{ "input": { "workflow": { "type": "t2i", ... } } }
```
Y debe responder con:
```json
{ "output": { "url": "https://..." } }
```

El handler del worker (Python) interpreta `type` y construye el grafo ComfyUI correspondiente, sube el output a R2, devuelve la URL.
