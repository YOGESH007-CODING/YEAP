/**
 * User-authored review feedback and notes are plain text. Strip all HTML rather
 * than preserving a subset, so the stored value is safe if a future surface
 * accidentally renders it as markup.
 *
 * Elements whose contents are code or non-text (script/style/etc.) are removed
 * together with everything between their open and close tags; every other tag
 * is dropped while the text between tags is kept.
 */
const CODE_ELEMENTS = /<(script|style|iframe|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const ANY_TAG = /<[^>]*>/g;

export const sanitizeUserText = (value: string): string =>
  value.replace(CODE_ELEMENTS, '').replace(ANY_TAG, '').trim();
