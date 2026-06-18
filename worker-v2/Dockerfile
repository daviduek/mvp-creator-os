# Thin layer on top of RunPod's official ComfyUI worker.
# Base image already has: ComfyUI + SDXL base + their tested handler.py + start.sh + GPU validation
# We just add our LoRA on top.

FROM runpod/worker-comfyui:5.5.0-sdxl

ARG LORA_URL="https://pub-59a7dc0002a9480faf4f6cb09c2bfd5e.r2.dev/loras/sashavan.safetensors"

# Bake the Sasha LoRA into the image so it's always available at /comfyui/models/loras/
RUN mkdir -p /comfyui/models/loras \
 && wget -q --show-progress -O /comfyui/models/loras/sashavan.safetensors "${LORA_URL}" \
 && ls -lh /comfyui/models/loras/sashavan.safetensors

# Optional: install ControlNet OpenPose for the pose-copy workflow
RUN wget -q -O /comfyui/models/controlnet/controlnet-openpose-sdxl.safetensors \
    "https://huggingface.co/xinsir/controlnet-openpose-sdxl-1.0/resolve/main/diffusion_pytorch_model.safetensors" \
    || echo "ControlNet download failed, pose mode will be unavailable"

# Inherit CMD/ENTRYPOINT from base — no changes needed.
