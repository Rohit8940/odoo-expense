const { Router } = require('express');
const { prisma } = require('../prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = Router();

router.post('/', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const admin = req.user;
    const { email, fullName, roleName, managerUserId, password = 'TEMP' } = req.body;

    const role = await prisma.role.findFirst({ where: { name: roleName } });
    if (!role) return res.status(400).json({ error: 'Invalid role' });

    const user = await prisma.user.create({
      data: { email, fullName, roleId: role.id, password, companyId: admin.companyId }
    });

    if (role.name !== 'ADMIN') {
      await prisma.employeeProfile.create({
        data: {
          userId: user.id,
          companyId: admin.companyId,
          managerUserId: managerUserId || null
        }
      });
    }

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:userId/manager', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { managerUserId } = req.body;

    const emp = await prisma.employeeProfile.update({
      where: { userId: Number(userId) },
      data: { managerUserId: managerUserId || null }
    });
    res.json(emp);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
