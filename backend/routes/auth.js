const router = require('express').Router();
const { PrismaClient, Role } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function token(user) {
  return jwt.sign({ sub: user.id, role: user.role, companyId: user.companyId }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
}

// POST /api/auth/signup  (admin + company)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, companyCountry, companyCurrency } = req.body;
    if (!name || !email || !password || !companyCountry || !companyCurrency) return res.status(400).json({ error: 'missing fields' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'email exists' });

    const company = await prisma.company.create({
      data: {
        name: `${name}'s Company`,
        country: companyCountry,
        defaultCurrency: companyCurrency
      }
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: name,
        lastName: '',
        role: Role.ADMIN,
        companyId: company.id,
        isManagerApprover: true
      }
    });

    return res.status(201).json({ user: { id: admin.id, email: admin.email, role: admin.role }, company });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'signup_failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    return res.json({
      token: token(user),
      user: { id: user.id, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'login_failed' });
  }
});


router.post('/change-password', requireAuth, async (req,res)=>{
  const { currentPassword, newPassword } = req.body;
  const me = await prisma.user.findUnique({ where: { id: req.auth.sub } });
  if (!me) return res.status(404).json({ error: 'user_not_found' });
  const ok = await bcrypt.compare(currentPassword, me.passwordHash);
  if (!ok) return res.status(400).json({ error: 'wrong_password' });

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: hash, mustChangePassword: false }
  });
  return res.json({ ok: true });
});

module.exports = router;
