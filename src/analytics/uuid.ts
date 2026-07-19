export type UUIDFactory = () => string;

function randomByte(): number {
  return Math.floor(Math.random() * 256);
}

export function createUUID(): string {
  const bytes = new Uint8Array(16);
  const cryptoImplementation = globalThis.crypto;

  if (typeof cryptoImplementation?.getRandomValues === 'function') {
    cryptoImplementation.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = randomByte();
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hexadecimal = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return [
    hexadecimal.slice(0, 4).join(''),
    hexadecimal.slice(4, 6).join(''),
    hexadecimal.slice(6, 8).join(''),
    hexadecimal.slice(8, 10).join(''),
    hexadecimal.slice(10).join(''),
  ].join('-');
}
