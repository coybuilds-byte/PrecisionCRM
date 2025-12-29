import argon2 from 'argon2';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import type { User, Session } from '@shared/schema';

// Security configuration
const AUTH_PEPPER = process.env.AUTH_PEPPER || 'default-pepper-change-in-production';
const SESSION_PEPPER = process.env.SESSION_PEPPER || 'default-session-pepper-change-in-production';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Hash a password with Argon2 and pepper
 */
export async function hashPassword(password: string): Promise<string> {
  const pepperedPassword = password + AUTH_PEPPER;
  return await argon2.hash(pepperedPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const pepperedPassword = password + AUTH_PEPPER;
    return await argon2.verify(hash, pepperedPassword);
  } catch (error) {
    return false;
  }
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a session token for storage
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token + SESSION_PEPPER).digest('hex');
}

/**
 * Create a new session for a user
 */
export async function createSession(user: User, ipAddress?: string, userAgent?: string): Promise<{ session: Session; token: string }> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  const session = await storage.createSession({
    userId: user.id,
    tokenHash,
    expiresAt,
    ipAddress: ipAddress || '',
    userAgent: userAgent || ''
  });

  return { session, token };
}

/**
 * Authenticate middleware - verifies session token
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.SESSION_ID;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const tokenHash = hashSessionToken(token);
    const session = await storage.getSessionByTokenHash(tokenHash);

    if (!session) {
      res.clearCookie('SESSION_ID');
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get user with recruiter information
    const user = await storage.getUserById(session.userId);
    if (!user) {
      await storage.revokeSession(session.id);
      res.clearCookie('SESSION_ID');
      return res.status(401).json({ error: 'User not found' });
    }

    // Update session activity (but not on every request, only every 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (session.lastActiveAt && session.lastActiveAt < fiveMinutesAgo) {
      await storage.updateSessionActivity(session.id);
    }

    // Add user and session to request
    (req as any).user = user;
    (req as any).session = session;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Require authentication middleware
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  authenticate(req, res, next);
}

/**
 * Get client IP address
 */
export function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         req.headers['x-real-ip'] as string || 
         req.connection.remoteAddress || 
         req.ip || 
         'unknown';
}

/**
 * Check if user account is locked
 */
export function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) return false;
  return user.lockedUntil > new Date();
}

/**
 * Handle failed login attempt
 */
export async function handleFailedLogin(user: User): Promise<void> {
  const attempts = (user.failedLoginAttempts || 0) + 1;
  let lockedUntil: Date | undefined;

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
  }

  await storage.updateUserLoginAttempts(user.id, attempts, lockedUntil);
}

/**
 * Handle successful login
 */
export async function handleSuccessfulLogin(user: User): Promise<void> {
  await storage.updateUserLastLogin(user.id);
}

/**
 * Set secure session cookie
 */
export function setSessionCookie(res: Response, token: string): void {
  res.cookie('SESSION_ID', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/'
  });
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(res: Response): void {
  res.clearCookie('SESSION_ID', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}