# Thin layer on top of RunPod's official ComfyUI worker.
# Base image already has: ComfyUI + SDXL base + their tested handler.py + start.sh + GPU validation
# We just add our LoRA on top.

# Use :base variant (no models pre-baked) to fit GitHub Actions runner disk quota.
# Models are downloaded lazily on first worker spawn (RunPod caches per-host).
FROM runpod/worker-comfyui:5.5.0-base

# Bake only the Sasha LoRA (~870MB) — small enough.
ARG LORA_URL="https://pub-59a7dc0002a9480faf4f6cb09c2bfd5e.r2.dev/loras/sashavan.safetensors"
RUN mkdir -p /comfyui/models/loras \
 && wget -q -O /comfyui/models/loras/sashavan.safetensors "${LORA_URL}" \
 && ls -lh /comfyui/models/loras/sashavan.safetensors

# SDXL + ControlNet are pulled on demand via a small init wrapper.
COPY init_models.sh /init_models.sh
RUN chmod +x /init_models.sh

# Override start: download models if missing, then exec the official start.
COPY start_wrapper.sh /start_wrapper.sh
RUN chmod +x /start_wrapper.sh
CMD ["/start_wrapper.sh"]
