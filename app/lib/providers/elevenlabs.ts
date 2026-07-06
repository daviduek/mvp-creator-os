/**
 * ElevenLabs TTS — turns a script into Sasha's voice (mp3 bytes).
 *
 * Used by the `talk` mode: the audio produced here drives the OmniHuman
 * talking-head avatar. ElevenLabs only does audio; the lip-sync/video is fal.
 */

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

/** Sasha's default voice. Sarah (premade, US female, warm/confident) until a
 *  custom Sasha voice is designed. Override with ELEVENLABS_SASHA_VOICE_ID. */
const DEFAULT_VOICE = process.env.ELEVENLABS_SASHA_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
const TTS_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

function key(): string {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error('ELEVENLABS_API_KEY no configurada');
  return k;
}

/** Synthesize `script` in Sasha's voice. Returns the mp3 audio as a Buffer. */
export async function tts(script: string, voiceId?: string): Promise<Buffer> {
  const vid = voiceId || DEFAULT_VOICE;
  const res = await fetch(`${ELEVEN_BASE}/text-to-speech/${vid}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key(),
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: script,
      model_id: TTS_MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${t.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
