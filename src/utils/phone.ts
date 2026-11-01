/** Keep national numbers intact; remove India's country code only from a complete number. */
export function normalizeIndianPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}
