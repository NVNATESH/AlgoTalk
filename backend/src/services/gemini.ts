import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { env, getGeminiKeys } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';

/* ── Multi-key rotation ────────────────────────────────────────────── */
const allKeys = getGeminiKeys();
let currentKeyIndex = 0;

function currentKey(): string {
  if (allKeys.length === 0) {
    throw ApiError.badRequest('No GEMINI_API_KEY or GEMINI_API_KEYS configured on the server');
  }
  return allKeys[currentKeyIndex % allKeys.length];
}

function rotateKey(): boolean {
  if (allKeys.length <= 1) return false;
  const prev = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % allKeys.length;
  // Reset cached clients so a new one is built with the next key.
  _genAI = null;
  _flash = null;
  _pro = null;
  logger.info(
    `gemini: rotated API key ${prev % allKeys.length} → ${currentKeyIndex} (${allKeys.length} keys available)`
  );
  return true;
}

let _genAI: GoogleGenerativeAI | null = null;
function client() {
  const key = currentKey();
  if (!_genAI) _genAI = new GoogleGenerativeAI(key);
  return _genAI;
}

let _flash: GenerativeModel | null = null;
let _pro: GenerativeModel | null = null;

export const flashModel = () => {
  if (!_flash) {
    _flash = client().getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
    });
  }
  return _flash;
};

export const proModel = () => {
  if (!_pro) {
    _pro = client().getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
    });
  }
  return _pro;
};

export const flashChatModel = () =>
  client().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.6 },
  });

export async function geminiJSON<T>(
  prompt: string,
  opts: { model?: GenerativeModel; retries?: number } = {}
): Promise<T> {
  const requested = opts.model ?? flashModel();
  const retries = opts.retries ?? 2;
  let lastErr: unknown;

  // Track whether we've already swapped pro → flash. Pro is the free-tier
  // bottleneck — it's the first thing to 429. When that happens we fall back
  // to flash exactly once and continue retrying with the cheaper model.
  let model = requested;
  let downgraded = false;

  // Also track how many keys we've tried (for multi-key rotation).
  let keysTriedCount = 0;
  const maxKeyRotations = allKeys.length;

  for (let i = 0; i <= retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return parseLooseJson<T>(text);
    } catch (err) {
      lastErr = err;
      const status = (err as any)?.status ?? (err as any)?.response?.status;
      const msg = (err as Error).message ?? '';
      const quotaHit = status === 429 || /429|quota|Too Many Requests/i.test(msg);
      logger.warn(
        { err: msg, status, attempt: i + 1, downgraded },
        'gemini call failed, retrying'
      );

      // On quota error, try rotating to the next API key first.
      if (quotaHit && keysTriedCount < maxKeyRotations) {
        const rotated = rotateKey();
        if (rotated) {
          keysTriedCount++;
          // Rebuild model references with new key
          model = requested === proModel() ? proModel() : flashModel();
          continue; // immediate retry with new key
        }
      }

      // On quota error, swap to flash for the remaining retries. Pro vs flash
      // produces lower-quality output but a result the user can use beats a
      // 502 every time.
      if (quotaHit && !downgraded && model !== flashModel()) {
        model = flashModel();
        downgraded = true;
        logger.info('gemini: downgraded pro → flash after quota error');
        continue; // immediate retry with the cheaper model
      }
      if (i < retries) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  const reason = lastErr instanceof Error ? lastErr.message : String(lastErr ?? '');
  // Surface a more actionable message when we know why it failed.
  const friendly = /quota|429|Too Many Requests/i.test(reason)
    ? 'AI quota exceeded — try again in a minute, or set GEMINI_API_KEY to a paid-tier key.'
    : 'AI service unavailable';
  throw new ApiError(502, friendly, { reason });
}

export async function* geminiStream(prompt: string) {
  const model = flashChatModel();
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}

export interface ChatHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

export async function* mentorChatStream(
  systemInstruction: string,
  history: ChatHistoryMessage[],
  userMessage: string
) {
  const model = client().getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
    generationConfig: { temperature: 0.6 },
  });
  const chat = model.startChat({
    history: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
  });

  // Retry for 503 / overloaded errors before any chunks have streamed.
  let result;
  let attempt = 0;
  const maxAttempts = 3;
  while (true) {
    try {
      result = await chat.sendMessageStream(userMessage);
      break;
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const transient = status === 503 || status === 429 || status === 500;
      attempt++;
      if (!transient || attempt >= maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 700 * attempt));
    }
  }

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}

function parseLooseJson<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // strip ```json fences if Gemini ignored responseMimeType
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      return JSON.parse(fenced[1]) as T;
    }
    // grab first {...} or [...] block
    const obj = trimmed.match(/[{\[][\s\S]*[}\]]/);
    if (obj) return JSON.parse(obj[0]) as T;
    throw new Error('Could not parse JSON from Gemini response');
  }
}
