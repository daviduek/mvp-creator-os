"""Thin wrapper around ComfyUI's HTTP API."""
import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path

import requests


class ComfyClient:
    def __init__(self, base_url: str):
        self.base = base_url.rstrip("/")

    def wait_until_ready(self, timeout: int = 120):
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                r = requests.get(f"{self.base}/system_stats", timeout=5)
                if r.ok:
                    return
            except Exception:
                pass
            time.sleep(2)
        raise RuntimeError("ComfyUI no responde")

    def download_model(self, url: str, folder: str, filename: str):
        """Download model file into ComfyUI/<folder>/<filename> if not present."""
        models_root = os.environ.get("COMFY_MODELS_DIR", "/workspace/ComfyUI/models")
        target_dir = Path(models_root) / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / filename
        if target.exists() and target.stat().st_size > 0:
            return str(target)
        print(f"[comfy] Bajando {url} → {target}")
        with requests.get(url, stream=True, timeout=600) as r:
            r.raise_for_status()
            with open(target, "wb") as f:
                for chunk in r.iter_content(chunk_size=1 << 20):
                    f.write(chunk)
        return str(target)

    def submit(self, graph: dict) -> str:
        payload = {"prompt": graph, "client_id": "mvp-creator-os"}
        r = requests.post(f"{self.base}/prompt", json=payload, timeout=30)
        r.raise_for_status()
        data = r.json()
        return data["prompt_id"]

    def wait_for_outputs(self, prompt_id: str, timeout: int = 600) -> list[str]:
        deadline = time.time() + timeout
        while time.time() < deadline:
            r = requests.get(f"{self.base}/history/{prompt_id}", timeout=15)
            if r.ok:
                hist = r.json().get(prompt_id)
                if hist and hist.get("status", {}).get("completed"):
                    outputs = []
                    for node_id, node_out in hist.get("outputs", {}).items():
                        for kind in ("images", "gifs", "videos"):
                            for item in node_out.get(kind, []) or []:
                                outputs.append(item["filename"])
                    return outputs
            time.sleep(3)
        raise TimeoutError(f"Timeout esperando prompt {prompt_id}")

    def fetch_output(self, filename: str, subfolder: str = "", type_: str = "output") -> bytes:
        params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": type_})
        r = requests.get(f"{self.base}/view?{params}", timeout=120)
        r.raise_for_status()
        return r.content
