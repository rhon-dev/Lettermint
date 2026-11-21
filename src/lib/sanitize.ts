export const MAX_CHARS = 2;
const ALLOWED = /^[A-Za-z0-9&]$/;

/** Keep only A–Z, a–z, 0–9 and "&", at most MAX_CHARS characters. Case is preserved. */
export function sanitizeText(raw: string): string {
  let out = '';
  for (const ch of raw) {
    if (!ALLOWED.test(ch)) continue;
    out += ch;
    if (out.length === MAX_CHARS) break;
  }
  return out;
}

export function displayText(text: string, uppercase: boolean): string {
  return uppercase ? text.toUpperCase() : text;
}
