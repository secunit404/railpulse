import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';
import dayjs from 'dayjs';
import prisma from '../prisma';
import { sendPasswordResetEmail, isSmtpConfigured } from '../utils/mailer';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
  inviteCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const createInviteSchema = z.object({
  expiresInDays: z.number().int().positive().optional().nullable(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

const adminResetPasswordSchema = z.object({
  email: z.string().email(),
  sendEmail: z.boolean().optional(),
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, displayName, inviteCode } = registerSchema.parse(req.body);

    // Check if this is the first user
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    if (!isFirstUser) {
      // Require invite code for non-first users
      if (!inviteCode) {
        res.status(400).json({ error: 'Invite code required' });
        return;
      }

      // Validate invite code
      const invite = await prisma.inviteCode.findUnique({
        where: { code: inviteCode },
      });

      if (!invite || !invite.active) {
        res.status(403).json({ error: 'Invalid invite code' });
        return;
      }

      if (invite.usedAt) {
        res.status(403).json({ error: 'Invite code already used' });
        return;
      }

      if (invite.expiresAt && dayjs(invite.expiresAt).isBefore(dayjs())) {
        res.status(403).json({ error: 'Invite code expired' });
        return;
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: displayName || null,
        isAdmin: isFirstUser,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    if (!isFirstUser && inviteCode) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          usedInviteCode: {
            connect: { code: inviteCode }
          }
        }
      });

      await prisma.inviteCode.update({
        where: { code: inviteCode },
        data: {
          usedAt: new Date(),
          active: false,
        },
      });
    }

    const jwtSecret = process.env.JWT_SECRET!;
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info(`User registered: ${email}${isFirstUser ? ' (first admin)' : ''}`);

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    logger.info(`Login attempt: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET!;
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.get('/first-user', async (req, res, next) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ isFirstUser: userCount === 0 });
  } catch (error) {
    next(error);
  }
});

router.post('/invites', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { expiresInDays } = createInviteSchema.parse(req.body);

    const code = uuidv4();
    const expiresAt = expiresInDays
      ? dayjs().add(expiresInDays, 'day').toDate()
      : null;

    const invite = await prisma.inviteCode.create({
      data: {
        code,
        createdBy: req.user!.id,
        expiresAt,
        active: true,
      },
    });

    logger.info(`Invite code created by ${req.user!.email}, expires: ${expiresAt || 'never'}`);

    res.json({
      success: true,
      invite: {
        id: invite.id,
        code: invite.code,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/invites', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const invites = await prisma.inviteCode.findMany({
      where: { createdBy: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    const invitesWithStatus = invites.map((invite: (typeof invites)[number]) => ({
      ...invite,
      isExpired: invite.expiresAt ? dayjs(invite.expiresAt).isBefore(dayjs()) : false,
      isUsed: !!invite.usedAt,
    }));

    res.json({ invites: invitesWithStatus });
  } catch (error) {
    next(error);
  }
});

router.get('/invites/all', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const invites = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            email: true,
            displayName: true,
          },
        },
        usedBy: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    const invitesWithStatus = invites.map((invite) => ({
      id: invite.id,
      code: invite.code,
      createdBy: invite.createdBy,
      creatorEmail: invite.creator.email,
      creatorDisplayName: invite.creator.displayName,
      expiresAt: invite.expiresAt,
      usedAt: invite.usedAt,
      usedByEmail: invite.usedBy.length > 0 ? invite.usedBy[0].email : null,
      usedByDisplayName: invite.usedBy.length > 0 ? invite.usedBy[0].displayName : null,
      active: invite.active,
      createdAt: invite.createdAt,
      isExpired: invite.expiresAt ? dayjs(invite.expiresAt).isBefore(dayjs()) : false,
      isUsed: !!invite.usedAt,
    }));

    res.json({ invites: invitesWithStatus });
  } catch (error) {
    next(error);
  }
});

router.delete('/invites/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const inviteId = parseInt(req.params.id);
    const permanent = req.query.permanent === 'true';

    if (isNaN(inviteId)) {
      res.status(400).json({ error: 'Invalid invite code ID' });
      return;
    }

    const invite = await prisma.inviteCode.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      res.status(404).json({ error: 'Invite code not found' });
      return;
    }

    if (permanent) {
      await prisma.inviteCode.delete({
        where: { id: inviteId },
      });

      logger.info(`Invite code ${invite.code} permanently deleted by ${req.user!.email}`);

      res.json({
        success: true,
        message: 'Invite code permanently deleted',
      });
    } else {
      await prisma.inviteCode.update({
        where: { id: inviteId },
        data: { active: false },
      });

      logger.info(`Invite code ${invite.code} deactivated by ${req.user!.email}`);

      res.json({
        success: true,
        message: 'Invite code deactivated',
      });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.json({
        success: true,
        message: 'If the email exists, a reset token will be generated'
      });
      return;
    }

    const token = uuidv4();
    const expiresAt = dayjs().add(1, 'hour').toDate();

    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    logger.info(`Password reset requested for: ${email}`);

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendBase.replace(/\/$/, '')}/reset-password/${token}`;

    if (isSmtpConfigured()) {
      sendPasswordResetEmail(email, resetLink).catch((err) => {
        logger.error(`Password reset email failed for ${email}: ${err.message}`);
      });
    } else {
      logger.warn('SMTP not configured; password reset email not sent');
    }

    const isDevMode = process.env.NODE_ENV !== 'production';

    res.json({
      success: true,
      message: 'If the email exists, a reset token will be generated',
      ...(isDevMode && { resetToken: token, resetLink }),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/reset-password', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { email, sendEmail } = adminResetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const token = uuidv4();
    const expiresAt = dayjs().add(1, 'hour').toDate();

    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendBase.replace(/\/$/, '')}/reset-password/${token}`;

    const smtpConfigured = isSmtpConfigured();

    if (sendEmail && smtpConfigured) {
      sendPasswordResetEmail(email, resetLink).catch((err) => {
        logger.error(`Admin-triggered password reset email failed for ${email}: ${err.message}`);
      });
    }

    logger.info(`Admin ${req.user!.email} generated password reset for: ${email}${sendEmail && smtpConfigured ? ' (email attempted)' : ' (manual delivery)'}`);

    res.json({
      success: true,
      message: sendEmail && smtpConfigured
        ? 'Reset link generated; email sent'
        : 'Reset link generated; share the link manually',
      resetToken: token,
      resetLink,
      delivery: sendEmail && smtpConfigured ? 'email' : 'manual',
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const resetToken = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    if (resetToken.usedAt) {
      res.status(400).json({ error: 'Reset token already used' });
      return;
    }

    if (dayjs(resetToken.expiresAt).isBefore(dayjs())) {
      res.status(400).json({ error: 'Reset token expired' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    logger.info(`Password reset completed for user: ${resetToken.user.email}`);

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
