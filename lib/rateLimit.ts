/**
 * Rate limiting con ventana fija.
 *
 * - Si están definidas UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, usa
 *   Redis (Upstash) vía REST → límite **distribuido**, válido en multi-instancia
 *   / serverless (Vercel). No requiere SDK: solo `fetch`.
 * - Si no, cae a un contador en memoria por instancia (suficiente para dev o
 *   despliegue de instancia única).
 *
 * La función es async para soportar el backend remoto de forma transparente.
 */

export type RateResult = { success: boolean; remaining: number; retryAfter: number };

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(UPSTASH_URL && UPSTASH_TOKEN);

/* ───────────────────────── Backend en memoria ───────────────────────── */

type Bucket = number[]; // timestamps (ms) de los hits dentro de la ventana
const store = new Map<string, Bucket>();

function memoryLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    const retryAfter = Math.ceil((hits[0] + windowMs - now) / 1000);
    store.set(key, hits);
    return { success: false, remaining: 0, retryAfter };
  }

  hits.push(now);
  store.set(key, hits);

  // Limpieza oportunista para que el Map no crezca sin límite.
  if (store.size > 5000) {
    for (const [k, v] of store) {
      const fresh = v.filter((t) => t > cutoff);
      if (fresh.length === 0) store.delete(k);
      else store.set(k, fresh);
    }
  }

  return { success: true, remaining: limit - hits.length, retryAfter: 0 };
}

/* ───────────────────────── Backend Redis (Upstash) ───────────────────────── */

async function redisLimit(key: string, limit: number, windowMs: number): Promise<RateResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs);
  const windowKey = `rl:${key}:${windowStart}`;
  const resetAt = (windowStart + 1) * windowMs;

  // Pipeline atómico: INCR + fijar caducidad solo la primera vez (NX).
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", windowKey],
      ["PEXPIRE", windowKey, windowMs, "NX"],
    ]),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const data = (await res.json()) as { result: unknown }[];
  const count = Number(data[0]?.result ?? 0);

  if (count > limit) {
    return { success: false, remaining: 0, retryAfter: Math.ceil((resetAt - now) / 1000) };
  }
  return { success: true, remaining: Math.max(0, limit - count), retryAfter: 0 };
}

/* ───────────────────────── API pública ───────────────────────── */

/**
 * @param key      identificador (p.ej. "login:1.2.3.4")
 * @param limit    nº máximo de intentos en la ventana
 * @param windowMs tamaño de la ventana en ms
 */
export async function rateLimit(key: string, limit = 5, windowMs = 60_000): Promise<RateResult> {
  if (useRedis) {
    try {
      return await redisLimit(key, limit, windowMs);
    } catch (err) {
      // Fail-open: si Redis falla, no tumbamos el login; degradamos a memoria.
      console.error("[rateLimit] Upstash no disponible, fallback en memoria:", err);
      return memoryLimit(key, limit, windowMs);
    }
  }
  return memoryLimit(key, limit, windowMs);
}
