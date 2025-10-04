const { Router } = require('express');
const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma');
const { JWT_SECRET } = require('../config');
const { hashPassword, comparePassword } = require('../utils/hash');
const { createCompanyWithAdmin } = require('../services/company.service');

const router = Router();

const SUPPORTED_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

function ensureJwtConfigured() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
}

async function ensureDefaultRoles() {
  for (const name of SUPPORTED_ROLES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
}

function buildTokenPayload(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    companyId: user.companyId,
    role: user.role?.name || user.role
  };
}

function sanitizeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

router.post('/signup', async (req, res) => {
  try {
    ensureJwtConfigured();
    await ensureDefaultRoles();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const { companyName, countryCode, email, password, fullName } = req.body || {};

  if (!companyName || !countryCode || !email || !password || !fullName) {
    return res.status(400).json({
      message: 'companyName, countryCode, fullName, email, and password are required'
    });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await hashPassword(password);

    const { company, admin } = await createCompanyWithAdmin({
      companyName: companyName.trim(),
      countryCode: countryCode.trim().toUpperCase(),
      adminEmail: email.trim().toLowerCase(),
      passwordHash,
      fullName: fullName.trim()
    });

    const freshAdmin = await prisma.user.findUnique({
      where: { id: admin.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        companyId: true,
        createdAt: true,
        role: { select: { id: true, name: true } }
      }
    });

    const token = jwt.sign(buildTokenPayload(freshAdmin), JWT_SECRET, { expiresIn: '1d' });

    return res.status(201).json({ user: freshAdmin, company, token });
  } catch (err) {
    console.error('Signup error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    ensureJwtConfigured();
    await ensureDefaultRoles();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        password: true,
        companyId: true,
        createdAt: true,
        role: { select: { id: true, name: true } }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const safeUser = sanitizeUser(user);
    const token = jwt.sign(buildTokenPayload(user), JWT_SECRET, { expiresIn: '1d' });

    return res.status(200).json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
