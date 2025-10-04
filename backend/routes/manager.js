const router = require('express').Router();
const { PrismaClient, ExpenseStatus, ApprovalDecision } = require('@prisma/client');
const prisma = new PrismaClient();
const { getRate } = require('../lib/fx');

async function companyOf(userId) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true }
  });
  return u?.companyId;
}
async function companyBaseCurrency(companyId) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { defaultCurrency: true }
  });
  return c?.defaultCurrency || 'USD';
}

function ensureConverted(expense, baseCurrency) {
  if (expense.amountInCompanyCcy && expense.conversionRate) {
    return {
      convertedAmount: Number(expense.amountInCompanyCcy),
      rate: Number(expense.conversionRate)
    };
  }
  return getRate(expense.currency, baseCurrency).then((rate) => ({
    convertedAmount: Math.round(Number(expense.amount) * rate * 100) / 100,
    rate
  }));
}

router.get('/pending', async (req, res) => {
  try {
    const companyId = await companyOf(req.query.me);
    const base = await companyBaseCurrency(companyId);

    const rows = await prisma.expense.findMany({
      where: {
        companyId,
        status: { in: [ExpenseStatus.SUBMITTED, ExpenseStatus.IN_REVIEW] }
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        category: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mapped = await Promise.all(rows.map(async (e) => {
      const fx = await ensureConverted(e, base);
      return {
        id: e.id,
        description: e.description,
        status: e.status,
        category: e.category?.name || null,
        employee: `${e.employee?.firstName || ''} ${e.employee?.lastName || ''}`.trim(),
        amount: Number(e.amount),
        currency: e.currency,
        baseCurrency: base,
        convertedAmount: fx.convertedAmount,
        fxRate: fx.rate,
        expenseDate: e.expenseDate
      };
    }));
    res.json(mapped);
  } catch (e) { console.error(e); res.status(500).json({ error: 'pending_failed' }); }
});

router.get('/history', async (req, res) => {
  try {
    const companyId = await companyOf(req.query.me);
    const base = await companyBaseCurrency(companyId);
    const rows = await prisma.expense.findMany({
      where: {
        companyId,
        status: { in: [ExpenseStatus.APPROVED, ExpenseStatus.REJECTED] }
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        category: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    const mapped = await Promise.all(rows.map(async (e) => {
      const fx = await ensureConverted(e, base);
      return {
        id: e.id,
        description: e.description,
        status: e.status,
        category: e.category?.name || null,
        employee: `${e.employee?.firstName || ''} ${e.employee?.lastName || ''}`.trim(),
        amount: Number(e.amount),
        currency: e.currency,
        baseCurrency: base,
        convertedAmount: fx.convertedAmount,
        fxRate: fx.rate,
        expenseDate: e.expenseDate,
        updatedAt: e.updatedAt
      };
    }));
    res.json(mapped);
  } catch (e) { console.error(e); res.status(500).json({ error: 'history_failed' }); }
});

router.post('/expenses/:id/decision', async (req, res) => {
  try {
    const { me, approve, note } = req.body;

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        status: approve ? ExpenseStatus.APPROVED : ExpenseStatus.REJECTED,
        approvals: {
          create: {
            stepOrder: 1,
            approverUserId: me,
            decision: approve ? ApprovalDecision.APPROVED : ApprovalDecision.REJECTED,
            comments: note || null,
            decidedAt: new Date()
          }
        }
      },
      include: {
        approvals: true
      }
    });
    res.json(expense);
  } catch (e) { console.error(e); res.status(500).json({ error: 'decision_failed' }); }
});

module.exports = router;
