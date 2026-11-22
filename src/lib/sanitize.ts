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

/** Characters the initials field rejected, each once, so the UI can say why they vanished. */
export function unsupportedInitials(raw: string): string[] {
  const out = new Set<string>();
  for (const ch of raw) if (!ALLOWED.test(ch)) out.add(/\s/.test(ch) ? 'space' : ch);
  return [...out];
}

export function displayText(text: string, uppercase: boolean): string {
  return uppercase ? text.toUpperCase() : text;
}

export const MAX_NAME = 32;
// The bundled fonts are Latin subsets, so other scripts would render as missing-glyph boxes.
const NAME_CHAR = /[A-Za-z0-9À-ÖØ-öø-ÿ &]/;
export const NAME_HINT = 'Latin letters, numbers, spaces and & only.';

/**
 * Brand name: HTML tags removed whole, then only Latin letters, digits, spaces and "&".
 * Keeps one trailing space so the field can be typed into; trim before display.
 */
export function sanitizeName(raw: string): string {
  let out = '';
  for (const ch of raw.replace(/<[^>]*>?/g, '')) if (NAME_CHAR.test(ch)) out += ch;
  return out.replace(/\s+/g, ' ').trimStart().slice(0, MAX_NAME);
}
