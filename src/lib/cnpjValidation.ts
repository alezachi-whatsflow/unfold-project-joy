/**
 * CNPJ Validation - Supports both numeric (legacy) and alphanumeric (2026+) formats.
 * Based on Resolução CGSIM 2026: alphanumeric characters in the first 12 positions,
 * with digits only in the last 2 (check digits).
 * Alphanumeric chars are converted via ASCII value - 48 for weighted sum calculation.
 */

const WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function charToValue(char: string): number {
  const code = char.toUpperCase().charCodeAt(0);
  // Numbers 0-9: ASCII 48-57 → values 0-9
  // Letters A-Z: ASCII 65-90 → values 17-42
  return code - 48;
}

function calcCheckDigit(chars: string[], weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += charToValue(chars[i]) * weights[i];
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function validateCNPJ(raw: string): boolean {
  const clean = raw.replace(/[.\-\/]/g, "").toUpperCase();
  if (clean.length !== 14) return false;

  // Check format: first 12 can be alphanumeric, last 2 must be digits
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(clean)) return false;

  // Reject all same character
  if (/^(.)\1{13}$/.test(clean)) return false;

  const chars = clean.split("");

  const d1 = calcCheckDigit(chars.slice(0, 12), WEIGHTS_1);
  if (d1 !== parseInt(chars[12])) return false;

  const d2 = calcCheckDigit(chars.slice(0, 13), WEIGHTS_2);
  if (d2 !== parseInt(chars[13])) return false;

  return true;
}

/**
 * Applies the visual mask XX.XXX.XXX/XXXX-XX to a raw CNPJ string.
 * Accepts alphanumeric characters in the first 12 positions.
 */
export function maskCNPJAlpha(value: string): string {
  // Keep only alphanumeric, max 14
  let clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 14);

  // Force last 2 positions to be numeric only
  if (clean.length > 12) {
    const root = clean.slice(0, 12);
    const check = clean.slice(12).replace(/[^0-9]/g, "");
    clean = root + check;
  }

  // Apply mask progressively
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
}

/** Strips mask characters, returns raw uppercase alphanumeric string */
export function unmaskCNPJ(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}
