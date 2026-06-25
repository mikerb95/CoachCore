import type { CSSProperties } from "react";

/**
 * Parse a CSS declaration string ("display:flex;gap:8px") into a React style
 * object. Lets us port the CoachCore design's inline styles close to 1:1.
 */
export function css(s: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of s.split(";")) {
    const i = decl.indexOf(":");
    if (i === -1) continue;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop || !val) continue;
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = val;
  }
  return out as CSSProperties;
}

/** Merge several CSS strings / style objects into one style object. */
export function cx(...parts: (string | CSSProperties | undefined | false)[]): CSSProperties {
  let out: CSSProperties = {};
  for (const p of parts) {
    if (!p) continue;
    out = { ...out, ...(typeof p === "string" ? css(p) : p) };
  }
  return out;
}
