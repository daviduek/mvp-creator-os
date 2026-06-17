# Worker — RunPod Serverless + ComfyUI

Container que corre como worker de RunPod Serverless. Cuando recibe un job:

1. Lee `input.workflow` (type + parámetros) del request
2. Carga el template ComfyUI correspondiente (`comfy_workflows/<type>.json`)
3. Inyecta los parámetros (prompt, image_url, lora_weight, etc.)
4. Si es motion y vino link de TikTok → baja el video con `yt-dlp`
5. Manda el workflow al ComfyUI local (puerto 8188)
6. Espera resultado, sube el output a Cloudflare R2
7. Devuelve `{ output: { url: "https://r2-public/..." } }`

## Estructura
- `handler.py` — entrypoint de RunPod Serverless
- `comfy_client.py` — wrapper de la API HTTP de ComfyUI
- `r2_uploader.py` — sube outputs a R2
- `tiktok_downloader.py` — yt-dlp wrapper
- `comfy_workflows/` — templates JSON exportados de ComfyUI
- `Dockerfile` — base con ComfyUI + custom nodes + LoRA
- `start.sh` — arranca ComfyUI en background y el handler

## Deploy a RunPod
```bash
# 1. Build local (opcional, para testear)
docker build -t mvp-creator-worker .

# 2. Push a Docker Hub o GHCR
docker tag mvp-creator-worker your-username/mvp-creator-worker
docker push your-username/mvp-creator-worker

# 3. En RunPod → Serverless → New Endpoint
#    - Container image: your-username/mvp-creator-worker:latest
#    - GPU: RTX 4090 (24GB) o A6000
#    - Min workers: 0 (escala a 0 cuando no hay trabajo = no gasta)
#    - Max workers: 2
#    - Idle timeout: 30s
```

## Environment variables del endpoint
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
- `SASHA_LORA_URL` — URL pública del .safetensors
