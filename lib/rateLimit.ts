/**
 * Rate limiting con ventana deslizante en memoria (por instancia).
 *
 * Suficiente para Hobby / instancia única. En producción multi-instancia,
 * define UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN e instala
 * `@upstash/ratelimit @upstash/redis` para un límite distribuido.
 */

type Bucket = number[]; // timestamps (ms) de los hits dentro de la ventana
const store = new Map<string, Bucket>();

export type RateResult = { success: boolean; remaining: number; retryAfter: number };

/**
 * @param key      identificador (p.ej. "login:email@x.com:1.2.3.4")
 * @param limit    nº máximo de intentos en la ventana
 * @param windowMs tamaño de la ventana en ms
 */
export function rateLimit(key: string, limit = 5, windowMs = 60_000): RateResult {
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
