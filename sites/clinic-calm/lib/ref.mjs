import { randomInt } from 'node:crypto';
// 31 symbols without look-alikes (no 0/O/1/I/L); 8 symbols ~ 8.5e11 combinations; not sequential, so a reference cannot be guessed by counting.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const REF_PATTERN = /^FZ-[2-9A-HJKMNP-Z]{8}$/;
export function newRef() {
  let s = '';
  for (let i = 0; i < 8; i += 1) s += ALPHABET[randomInt(ALPHABET.length)];
  return `FZ-${s}`;
}
