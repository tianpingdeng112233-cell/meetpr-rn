export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 320 && /^[^@\s]+@[^@.\s]+(?:\.[^@.\s]+)+$/.test(email);
}

export function isValidPassword(value: string): boolean {
  // Count Unicode code points and UTF-8 bytes without relying on TextEncoder
  // (not available in every React Native runtime).
  const characters = Array.from(value);
  const bytes = characters.reduce((total, character) => {
    const point = character.codePointAt(0)!;
    return total + (point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4);
  }, 0);
  return characters.length >= 8 && bytes <= 72;
}

export function isValidResetCode(value: string): boolean {
  return value.length === 6 && /^[0-9]{6}$/.test(value);
}
