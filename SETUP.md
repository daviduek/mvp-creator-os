# Setup — MVP Creator OS (multi-provider)

La UI ya está desplegada con arquitectura de **provider routing**: cada modo + tipo
de contenido (SFW/NSFW) se enruta al mejor proveedor. Para activar los modelos premium
solo faltan **2 API keys**. 10 minutos.

---

## ⚠️ LO MÁS IMPORTANTE — Identidad de Sasha en APIs

**Imagen 4, Veo 3 y Flux base NO conocen a Sasha.** Generan una persona genérica.
Para que la cara sea Sasha en proveedores API, hay que usar modelos que aceptan una
**imagen de referencia facial** (PuLID / face-id). Ya subí las 5 canon a R2 y el sistema
pasa `sasha_canon_01.png` como referencia automáticamente.

Por eso el default de **imagen SFW** es `fal-ai/flux-pulid` (Flux premium + cara de Sasha),
NO Imagen 4 puro. Si querés máxima calidad sin importar identidad (paisajes, etc.),
cambiás `FAL_MODEL_T2I_SFW=fal-ai/imagen4/preview/ultra`.

| Necesidad | Modelo recomendado | Identidad Sasha |
|-----------|--------------------|-----------------|
| Imagen SFW con Sasha | `fal-ai/flux-pulid` (default) | ✅ Sí (vía face ref) |
| Imagen SFW máx calidad | `fal-ai/imagen4/preview/ultra` | ❌ Persona genérica |
| Imagen NSFW con Sasha | Infra propia (CR Pony + IP-Adapter) | ✅ ~90% |
| Imagen NSFW máx calidad | Replicate Flux Lustify | ⚠️ Débil |

---

## Paso 1 — fal.ai (5 min)

Da acceso a Imagen 4, Veo 3, Runway, Flux-PuLID con UNA key.

1. Entrá a **https://fal.ai** → Sign up
2. **Dashboard → Keys → Create API Key**
3. Cargá crédito: **Billing → Add credits** ($20 alcanza para validar todo)
4. Copiá la key (formato `xxxxxxxx-xxxx-...`)

## Paso 2 — Replicate (opcional, solo NSFW premium) (3 min)

Solo si querés imagen NSFW vía API en vez de infra propia.

1. Entrá a **https://replicate.com** → Sign up
2. **Account → API tokens → Create token**
3. Cargá crédito en **Billing**
4. Copiá el token (formato `r8_xxxx`)

## Paso 3 — Pegar las keys en Vercel (2 min)

Decime las keys y yo las seteo, **o** vos:

1. https://vercel.com/daviduekdd-3978s-projects/mvp-creator-os/settings/environment-variables
2. Agregá:
   - `FAL_KEY` = (tu key de fal.ai)
   - `REPLICATE_API_TOKEN` = (tu token, opcional)
3. **Redeploy** (Deployments → ⋯ → Redeploy)

---

## Qué ya funciona sin tocar nada

| Modo | SFW | NSFW |
|------|-----|------|
| **Imagen** | fal flux-pulid (al pegar FAL_KEY) | Infra propia CR Pony + IP-Adapter (ya activa) |
| **Video** | Veo 3 (al pegar FAL_KEY) | Infra propia Wan 2.2 — pendiente build |
| **Animar** | Veo 3 i2v (al pegar FAL_KEY) | Infra propia — pendiente build |
| **Motion** | Runway (al pegar FAL_KEY) | MimicMotion infra propia — pendiente build |
| **Pose** | Pendiente | CR Pony + ControlNet (ya activa) |

Los modos NSFW de video se construyen después (worker Wan 2.2). El sistema ya los
muestra como "próximamente" en la UI, sin romperse.

---

## Cómo cambiar de modelo sin tocar código

Todos los model ids son env vars. Ejemplo: probar Kling en vez de Veo:
```
FAL_MODEL_T2V_SFW=fal-ai/kling-video/v2/master/text-to-video
```
Lista completa de variables en `.env.example`.

---

## Arquitectura (para referencia)

```
UI (GenerationForm)  ──POST /api/generate {mode, content, ...}
                            │
                     providers/router.ts  ── resuelve provider + modelo (por env)
                       ├── fal.ts        (Imagen4 / Veo3 / Runway / Flux-PuLID)
                       ├── replicate.ts  (Flux Lustify NSFW)
                       └── runpod.ts     (infra propia: CR Pony + IP-Adapter, Wan 2.2)
                            │
                     jobId opaco (base64url) ──► UI poll /api/poll/[jobId]
                            │
                     outputs ──► Cloudflare R2 ──► URL pública
```

El jobId codifica qué proveedor + cómo pollear, así que la UI es agnóstica.
