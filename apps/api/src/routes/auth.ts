import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  registerSchema,
  loginSchema,
} from '@hardstuck/shared';
import { User } from '../models/User';
import { Booster } from '../models/Booster';
import { UserNotificationPreferences } from '../models/Notification';
import {
  authenticate,
  AuthedRequest,
  signAccessToken,
  signRefreshToken,
} from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { env } from '../config/env';

const router = Router();

router.post('/register', validateBody(registerSchema), async (req, res: Response) => {
  try {
    const { username, email, password, role } = req.body;
    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });
    if (existing) {
      res.status(409).json({ error: 'Email or username already in use' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash,
      role,
      emailVerifyToken,
      emailVerified: env.nodeEnv === 'development',
    });

    if (role === 'booster') {
      await Booster.create({ userId: user._id });
    }

    await UserNotificationPreferences.create({ userId: user._id });

    const payload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      accessToken,
      // Stub: in production send via email
      emailVerifyToken:
        env.nodeEnv === 'development' ? emailVerifyToken : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', validateBody(loginSchema), async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    const payload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      accessToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req: AuthedRequest, res: Response) => {
  const user = await User.findById(req.user!.userId).select(
    '-passwordHash -twoFaSecret -passwordResetToken -emailVerifyToken'
  );
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

/** Stub: mark email verified with token. */
router.post('/verify-email', async (req, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: 'Token required' });
    return;
  }
  const user = await User.findOne({ emailVerifyToken: token });
  if (!user) {
    res.status(400).json({ error: 'Invalid token' });
    return;
  }
  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  await user.save();
  res.json({ ok: true });
});

/** Stub: request password reset. */
router.post('/forgot-password', async (req, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: 'Email required' });
    return;
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.passwordResetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    // Stub: enqueue email job
  }
  res.json({
    ok: true,
    message: 'If that email exists, a reset link was sent',
  });
});

router.post('/logout', (_req, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ ok: true });
});

export default router;
