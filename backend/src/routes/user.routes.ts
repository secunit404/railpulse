import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';
import prisma from '../prisma';

const router = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional().nullable(),
  timezone: z.string().optional(),
  email: z.string().email().optional(),
  hideBusReplacedTrains: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

router.get('/profile', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        timezone: true,
        hideBusReplacedTrains: true,
        isAdmin: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            monitors: true,
            searchHistory: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.patch('/profile', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);

    if (validatedData.email && validatedData.email !== req.user!.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(validatedData.displayName !== undefined && { displayName: validatedData.displayName }),
        ...(validatedData.timezone && { timezone: validatedData.timezone }),
        ...(validatedData.email && { email: validatedData.email }),
        ...(validatedData.hideBusReplacedTrains !== undefined && { hideBusReplacedTrains: validatedData.hideBusReplacedTrains }),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        timezone: true,
        hideBusReplacedTrains: true,
        isAdmin: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    logger.info(`User profile updated: ${req.user!.email}`);

    res.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!validPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash },
    });

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/account', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await prisma.user.delete({
      where: { id: req.user!.id },
    });

    logger.info(`User account deleted: ${req.user!.email}`);

    res.clearCookie('token');

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/all', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        usedInviteCodeId: true,
        usedInviteCode: {
          select: {
            code: true,
          },
        },
        _count: {
          select: {
            monitors: true,
          },
        },
      },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (userId === req.user!.id) {
      res.status(403).json({ error: 'Cannot change your own active status' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    logger.info(`User ${user.email} ${isActive ? 'activated' : 'deactivated'} by ${req.user!.email}`);

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (userId === req.user!.id) {
      res.status(403).json({ error: 'Cannot delete your own account. Use the profile page instead.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info(`User ${user.email} deleted by ${req.user!.email}`);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
