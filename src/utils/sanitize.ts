// Sanitización de datos del DOM para prevenir XSS
const UNSAFE_TAGS = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const UNSAFE_ATTRS = /\s(on\w+|style)\s*=\s*["'][^"']*["']/gi;

// Limpiar HTML peligroso de texto extraído del DOM
export function sanitizeText(input: string): string {
  return input
    .replace(UNSAFE_TAGS, '')
    .replace(UNSAFE_ATTRS, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

// Limpiar solo texto plano (sin HTML)
export function stripHtml(input: string): string {
  const doc = new DOMParser().parseFromString(input, 'text/html');
  return doc.body.textContent?.trim() ?? '';
}

// Validar que un string sea URL válida
export function isValidUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

// Validar respuesta de API
export function validateApiResponse<T>(
  data: unknown,
  requiredFields: string[],
): data is T {
  if (!data || typeof data !== 'object') return false;

  return requiredFields.every(
    (field) => field in (data as Record<string, unknown>),
  );
}

// Truncar texto largo para logs
export function truncate(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
