import sanitizeHtml from 'sanitize-html';

/**
 * User-authored review feedback and notes are plain text. Strip all HTML rather
 * than preserving a subset, so the stored value is safe if a future surface
 * accidentally renders it as markup.
 */
export const sanitizeUserText = (value: string): string =>
  sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
