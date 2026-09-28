import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../lib/db';
import { accessTokenOptions, getJwtSecret } from '../lib/security';

export interface AuthPayload {
  userId: number;
  role: string;
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request { user?: AuthPayload }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const match = header?.match(/^Bearer ([^\s]+)$/i);
  if (!match) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(match[1]!, getJwtSecret(), accessTokenOptions) as jwt.JwtPayload;
    const userId = Number(payload.sub);
    const tokenVersion = Number(payload.ver);
    if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(tokenVersion) || typeof payload.role !== 'string') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    let result;
    try {
      result = await pool.query('SELECT id, role, status, token_version FROM users WHERE id = $1', [userId]);
    } catch {
      return res.status(503).json({ error: 'Authentication service temporarily unavailable' });
    }
    const user = result.rows[0];
    if (!user || user.status !== 'ACTIVE' || user.token_version !== tokenVersion || user.role !== payload.role) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = { userId, role: user.role, tokenVersion };
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof Error && error.message.startsWith('JWT_SECRET')) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return next(error);
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  return next();
};

// Per-process request throttling limits credential guessing without adding infrastructure.
const attempts = new Map<string, { count: number; resetAt: number }>();
export const authRateLimit = (max = 10, windowMs = 15 * 60 * 1000) => (req: Request, res: Response, next: NextFunction) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  let entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    attempts.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > max) {
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  if (attempts.size > 10000) {
    for (const [ip, value] of attempts) if (value.resetAt <= now) attempts.delete(ip);
  }
  return next();
};

export const authenticateToken = requireAuth;
