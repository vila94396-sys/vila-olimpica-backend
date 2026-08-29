import { randomInt } from 'crypto';

// Sem caracteres ambíguos (0/O, 1/l/I) e sem símbolos — facilita envio por WhatsApp.
const CHARS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTempPassword(length = 12): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CHARS[randomInt(CHARS.length)];
  }
  return out;
}
