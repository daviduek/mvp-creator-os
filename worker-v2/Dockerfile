# syntax=docker/dockerfile:1.7
# Start from RunPod's official ComfyUI worker, base variant (no models).
FROM runpod/worker-comfyui:5.5.0-base

# Sasha LoRA (trained on SDXL base 1.0 → compatible with Lustify XL SDXL family).
RUN mkdir -p /comfyui/models/loras \
 && wget -q -O /comfyui/models/loras/sashavan.safetensors \
    "https://pub-59a7dc0002a9480faf4f6cb09c2bfd5e.r2.dev/loras/sashavan.safetensors" \
 && ls -lh /comfyui/models/loras/sashavan.safetensors

# Lustify SDXL NSFW APEX V8 — SDXL fine-tune, photorealistic by default, no safety bias.
# Token mounted as a BuildKit secret so it never lands in the final image layer.
# IMPORTANT: CivitAI redirects to Cloudflare R2 signed URLs and drops Authorization
# headers across the redirect — we have to put the token in the query string.
RUN --mount=type=secret,id=civitai_token \
    mkdir -p /comfyui/models/checkpoints \
 && TOKEN="$(cat /run/secrets/civitai_token)" \
 && wget --tries=3 --timeout=60 \
    -O /comfyui/models/checkpoints/lustifySDXL.safetensors \
    "https://civitai.com/api/download/models/2808677?token=${TOKEN}" \
 && ls -lh /comfyui/models/checkpoints/lustifySDXL.safetensors \
 && test $(stat -c %s /comfyui/models/checkpoints/lustifySDXL.safetensors) -gt 5000000000

# SDXL VAE fp16 fix (~330MB) for clean outputs
RUN mkdir -p /comfyui/models/vae \
 && wget -q -O /comfyui/models/vae/sdxl_vae.safetensors \
    "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors" \
 && ls -lh /comfyui/models/vae/sdxl_vae.safetensors

# Inherit CMD/ENTRYPOINT from base.
