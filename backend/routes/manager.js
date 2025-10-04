const router = require('express').Router();
const { PrismaClient, ExpenseStatus } = require('@prisma/client');
const prisma = new PrismaClient();
const { getRate } = require('../lib/fx');

// who am i’s company
async function companyOf(userId) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  return u?.companyId;
}
async function companyBaseCurrency(companyId) {
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { defaultCurrency: true } });
  return c?.defaultCurrency || 'USD';
}

// Pending for this manager (simple rule: show all company expenses in WAITING_APPROVAL)
router.get('/pending', async (req, res) => {
  try {
    const companyId = await companyOf(req.query.me);
    const base = await companyBaseCurrency(companyId);

    const rows = await prisma.expense.findMany({
      where: { companyId, status: ExpenseStatus.WAITING_APPROVAL },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // attach FX conversion
    const mapped = await Promise.all(rows.map(async e => {
      const rate = await getRate(e.currency, base);
      return {
        ...e,
        baseCurrency: base,
        convertedAmount: Math.round(e.amount * rate * 100) / 100,
        fxRate: rate
      };
    }));
    res.json(mapped);
  } catch (e) { console.error(e); res.status(500).json({ error: 'pending_failed' }); }
});

// History (approved or rejected)
router.get('/history', async (req, res) => {
  try {
    const companyId = await companyOf(req.query.me);
    const base = await companyBaseCurrency(companyId);
    const rows = await prisma.expense.findMany({
      where: { companyId, status: { in: [ExpenseStatus.APPROVED, ExpenseStatus.REJECTED] } },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    const mapped = await Promise.all(rows.map(async e => {
      const rate = await getRate(e.currency, base);
      return { ...e, baseCurrency: base, convertedAmount: Math.round(e.amount * rate * 100) / 100, fxRate: rate };
    }));
    res.json(mapped);
  } catch (e) { console.error(e); res.status(500).json({ error: 'history_failed' }); }
});

// Decision (MVP: single approver → final)
router.post('/expenses/:id/decision', async (req, res) => {
  try {
    const { me, approve, note } = req.body; // approve: true/false
    const updated = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        status: approve ? ExpenseStatus.APPROVED : ExpenseStatus.REJECTED,
        approvals: {
          create: {
            approverId: me,
            approved: !!approve,
            note: note || null
          }
        }
      },
      include: { approvals: true }
    });
    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ error: 'decision_failed' }); }
});

module.exports = router;
