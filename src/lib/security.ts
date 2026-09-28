import jwt from 'jsonwebtoken';

const TOKEN_ISSUER = 'vila-olimpica-api';
const TOKEN_AUDIENCE = 'vila-olimpica-app';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return secret;
}

export function signAccessToken(user: { id: number; role: string; token_version: number }): string {
  return jwt.sign(
    { role: user.role, ver: user.token_version },
    getJwtSecret(),
    { algorithm: 'HS256', subject: String(user.id), issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE, expiresIn: '1h' },
  );
}

export const accessTokenOptions = { algorithms: ['HS256'] as jwt.Algorithm[], issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE };
