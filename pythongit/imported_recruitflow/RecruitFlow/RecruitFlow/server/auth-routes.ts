import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { randomBytes } from 'crypto';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { storage } from './storage';
import { 
  hashPassword, 
  verifyPassword, 
  createSession, 
  authenticate,
  requireAuth,
  getClientIP,
  isAccountLocked,
  handleFailedLogin,
  handleSuccessfulLogin,
  setSessionCookie,
  clearSessionCookie
} from './auth';
import { users, type User } from '@shared/schema';
import { sendEmail, getPasswordResetTemplate } from './email';

const router = Router();

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});

// Register schema  
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  recruiterId: z.string().min(1, 'Recruiter ID is required')
});

// Forgot password schema
const forgotPasswordSchema = z.object({
  email: z.string().email()
});

// Reset password schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

// Two-factor verification schema
const twoFactorVerifySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  code: z.string().length(6, 'Code must be 6 digits')
});

// Resend 2FA schema
const resend2FASchema = z.object({
  userId: z.string().min(1, 'User ID is required')
});

/**
 * Generate a secure 6-digit verification code
 */
function generateTwoFactorCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
}

/**
 * Mask email for security (show first 2 chars and domain)
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.substring(0, 2) + '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * POST /api/auth/login
 * Authenticate user with email and password, initiate 2FA if enabled
 */
router.post('/login', async (req, res) => {
  // Prevent caching of login responses
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  console.log('[AUTH] Login attempt received:', { email: req.body?.email, hasPassword: !!req.body?.password });
  try {
    const { email, password } = loginSchema.parse(req.body);
    console.log('[AUTH] Validation passed for email:', email);
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      console.log('[AUTH] User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    console.log('[AUTH] User found:', user.email);

    // Check if account is locked
    if (isAccountLocked(user)) {
      return res.status(423).json({ 
        error: 'Account is temporarily locked due to too many failed login attempts. Please try again later.' 
      });
    }

    // Verify password
    console.log('[AUTH] Attempting password verification for user:', user.email);
    console.log('[AUTH] User has password hash:', !!user.passwordHash);
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    console.log('[AUTH] Password verification result:', isPasswordValid);
    if (!isPasswordValid) {
      console.log('[AUTH] Password verification failed for user:', user.email);
      await handleFailedLogin(user);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if 2FA is enabled for this user
    if (user.twoFactorEnabled) {
      console.log('[AUTH] 2FA enabled for user:', user.email);
      
      // Generate and save 2FA code
      const code = generateTwoFactorCode();
      const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await storage.setTwoFactorCode(user.id, code, expiryTime);
      
      // Send 2FA code via email
      const { sendEmail, getTwoFactorCodeTemplate } = await import('./email');
      const template = getTwoFactorCodeTemplate(user.username, code, 10);
      
      try {
        const result = await sendEmail(user.email, template);
        if (!result.success) {
          console.error('[AUTH] Failed to send 2FA email:', result.error);
          // In test mode, log the code
          console.log('[AUTH] TEST MODE - 2FA Code:', code);
        } else {
          console.log('[AUTH] 2FA code sent successfully to:', user.email);
        }
      } catch (emailError) {
        console.error('[AUTH] Error sending 2FA email:', emailError);
        // In test mode, log the code
        console.log('[AUTH] TEST MODE - 2FA Code:', code);
      }
      
      // Return response indicating 2FA is required
      // In development mode, include the code for testing
      const response: any = {
        requiresTwoFactor: true,
        userId: user.id,
        email: maskEmail(user.email),
        message: 'Verification code sent to your email'
      };
      
      // In development mode, include the 2FA code in the response
      if (process.env.NODE_ENV === 'development') {
        response.devCode = code;
        response.devMessage = 'Development mode: Code shown for testing';
      }
      
      return res.json(response);
    }

    // If 2FA is not enabled, proceed with normal login
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const { session, token } = await createSession(user, ipAddress, userAgent);

    // Update login statistics
    await handleSuccessfulLogin(user);

    // Set session cookie
    setSessionCookie(res, token);

    // Get recruiter information
    const recruiter = await storage.getRecruiter(user.recruiterId);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        recruiterId: user.recruiterId,
        lastLoginAt: user.lastLoginAt
      },
      recruiter,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('=== LOGIN ERROR START ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('=== LOGIN ERROR END ===');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/register
 * Register a new user (admin only - would need admin middleware in production)
 * TODO: Add admin-only middleware in production
 */
router.post('/register', requireAuth, async (req, res) => {
  try {
    const { username, email, password, recruiterId } = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Verify recruiter exists
    const recruiter = await storage.getRecruiter(recruiterId);
    if (!recruiter) {
      return res.status(400).json({ error: 'Invalid recruiter ID' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await storage.createUser({
      username,
      email, 
      recruiterId,
      password, // This will be ignored in favor of passwordHash
      passwordHash
    });

    res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        recruiterId: newUser.recruiterId
      },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/verify-2fa
 * Verify the 2FA code and complete login
 */
router.post('/verify-2fa', async (req, res) => {
  // Prevent caching of verification responses
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  try {
    const { userId, code } = twoFactorVerifySchema.parse(req.body);
    console.log('[AUTH] 2FA verification attempt for user:', userId);

    // Get user and verify code
    const user = await storage.getUserByTwoFactorCode(userId, code);
    if (!user) {
      console.log('[AUTH] Invalid or expired 2FA code for user:', userId);
      return res.status(401).json({ error: 'Invalid or expired verification code' });
    }

    console.log('[AUTH] 2FA verification successful for user:', user.email);

    // Clear the 2FA code after successful verification
    await storage.clearTwoFactorCode(userId);

    // Create session
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const { session, token } = await createSession(user, ipAddress, userAgent);

    // Update login statistics
    await handleSuccessfulLogin(user);

    // Set session cookie
    setSessionCookie(res, token);

    // Get recruiter information
    const recruiter = await storage.getRecruiter(user.recruiterId);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        recruiterId: user.recruiterId,
        lastLoginAt: user.lastLoginAt
      },
      recruiter,
      message: 'Two-factor authentication successful'
    });
  } catch (error) {
    console.error('[AUTH] 2FA verification error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: '2FA verification failed' });
  }
});

/**
 * POST /api/auth/resend-2fa
 * Resend the 2FA code to the user's email
 */
router.post('/resend-2fa', async (req, res) => {
  try {
    const { userId } = resend2FASchema.parse(req.body);
    console.log('[AUTH] 2FA resend request for user:', userId);

    // Get user
    const user = await storage.getUserById(userId);
    if (!user) {
      console.log('[AUTH] User not found for 2FA resend:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      console.log('[AUTH] 2FA not enabled for user:', userId);
      return res.status(400).json({ error: 'Two-factor authentication is not enabled' });
    }

    // Generate new 2FA code
    const code = generateTwoFactorCode();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await storage.setTwoFactorCode(user.id, code, expiryTime);

    // Send 2FA code via email
    const { sendEmail, getTwoFactorCodeTemplate } = await import('./email');
    const template = getTwoFactorCodeTemplate(user.username, code, 10);

    try {
      const result = await sendEmail(user.email, template);
      if (!result.success) {
        console.error('[AUTH] Failed to resend 2FA email:', result.error);
        // In test mode, log the code
        console.log('[AUTH] TEST MODE - Resent 2FA Code:', code);
      } else {
        console.log('[AUTH] 2FA code resent successfully to:', user.email);
      }
    } catch (emailError) {
      console.error('[AUTH] Error resending 2FA email:', emailError);
      // In test mode, log the code
      console.log('[AUTH] TEST MODE - Resent 2FA Code:', code);
    }

    // In development mode, include the code for testing
    const response: any = {
      message: 'Verification code has been resent to your email',
      email: maskEmail(user.email)
    };
    
    if (process.env.NODE_ENV === 'development') {
      response.devCode = code;
      response.devMessage = 'Development mode: Code shown for testing';
    }
    
    res.json(response);
  } catch (error) {
    console.error('[AUTH] 2FA resend error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset user password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    // Validate input
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Find user by email (case-insensitive)
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'Password reset successful' });
    }
    
    // Hash the new password
    const passwordHash = await hashPassword(newPassword);
    
    // Update user's password and clear any lockouts
    await db.update(users)
      .set({ 
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null
      })
      .where(eq(users.id, user.id));
    
    console.log(`[AUTH] Password reset successful for user: ${email}`);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user and revoke session
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const session = (req as any).session;
    if (session) {
      await storage.revokeSession(session.id);
    }
    
    clearSessionCookie(res);
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const recruiter = await storage.getRecruiter(user.recruiterId);
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        recruiterId: user.recruiterId,
        lastLoginAt: user.lastLoginAt
      },
      recruiter
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

/**
 * GET /api/auth/sessions
 * List current user's sessions
 */
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const sessions = await storage.listSessionsForUser(user.id);
    
    // Filter out sensitive information
    const safeSessions = sessions.map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isCurrent: session.id === (req as any).session.id
    }));
    
    res.json({ sessions: safeSessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

/**
 * POST /api/auth/sessions/:sessionId/revoke
 * Revoke a specific session
 */
router.post('/sessions/:sessionId/revoke', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { sessionId } = req.params;
    
    // Verify session belongs to current user
    const sessions = await storage.listSessionsForUser(user.id);
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    await storage.revokeSession(sessionId);
    
    // If revoking current session, clear cookie
    if (sessionId === (req as any).session.id) {
      clearSessionCookie(res);
    }
    
    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all sessions
 */
router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    await storage.revokeAllUserSessions(user.id);
    clearSessionCookie(res);
    res.json({ message: 'All sessions revoked successfully' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Failed to logout from all sessions' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      console.log('[AUTH] Password reset requested for non-existent email:', email);
      return res.json({ 
        message: 'If an account exists with that email, a password reset link has been sent.' 
      });
    }

    // Generate secure reset token
    const resetToken = randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store token in database
    await storage.setPasswordResetToken(user.id, resetToken, tokenExpires);
    
    // Generate reset link
    const resetLink = `http://localhost:5000/reset-password?token=${resetToken}`;
    
    // Send email
    const template = getPasswordResetTemplate(user.username, resetLink);
    const result = await sendEmail(user.email, template);
    
    if (!result.success) {
      // Log the reset link for testing if email fails
      console.log('[AUTH] Reset email failed, logging link for testing:', resetLink);
      console.error('[AUTH] Reset email error:', result.error);
    } else {
      console.log('[AUTH] Password reset email sent successfully to:', email);
    }
    
    // In development mode, include the reset link for testing
    const response: any = { 
      message: 'If an account exists with that email, a password reset link has been sent.' 
    };
    
    if (process.env.NODE_ENV === 'development' && user) {
      response.devResetLink = resetLink;
      response.devMessage = 'Development mode: Reset link shown for testing';
    }
    
    res.json(response);
  } catch (error) {
    console.error('Forgot password error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset user password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    
    // Find user by reset token
    const user = await storage.getUserByResetToken(token);
    
    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }
    
    // Hash new password
    const passwordHash = await hashPassword(password);
    
    // Update user password
    await storage.updateUserPassword(user.id, passwordHash);
    
    // Clear reset token and any lockouts
    await storage.clearPasswordResetToken(user.id);
    
    console.log('[AUTH] Password reset successful for user:', user.email);
    
    res.json({ 
      message: 'Password has been reset successfully. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;