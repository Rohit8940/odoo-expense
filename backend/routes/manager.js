const router = require('express').Router();
const { PrismaClient, ExpenseStatus, ApprovalDecision } = require('@prisma/client');
const prisma = new PrismaClient();
const { getRate } = require('../lib/fx');

async function companyOf(userId) {
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true }
  }).then(u => u?.companyId || null);
}
async function companyBaseCurrency(companyId) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { defaultCurrency: true }
  });
  return c?.defaultCurrency || 'USD';
}

async function ensureConverted(expense, baseCurrency) {
  try {
    if (expense.amountInCompanyCcy && expense.conversionRate) {
      return {
        convertedAmount: Number(expense.amountInCompanyCcy),
        rate: Number(expense.conversionRate)
      };
    }
    if (!expense.currency) {
      return { convertedAmount: null, rate: null };
    }
    const rate = await getRate(expense.currency, baseCurrency);
    const amount = Number(expense.amount);
    if (!Number.isFinite(amount)) {
      return { convertedAmount: null, rate };
    }
    const convertedAmount = Math.round(amount * rate * 100) / 100;
    return { convertedAmount, rate };
  } catch (err) {
    console.error('fx conversion failed', err);
    return { convertedAmount: null, rate: null };
  }
}

const INBOX_STATUSES = [
  ExpenseStatus.SUBMITTED,
  ExpenseStatus.IN_REVIEW,
  ExpenseStatus.APPROVED,
  ExpenseStatus.REJECTED
];

function ownerName(expense) {
  const employee = expense.employee || expense.user;
  if (!employee) return null;
  const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
  return name || null;
}

function mapExpense(expense, base, fxInfo) {
  const amount = Number(expense.amount);
  return {
    id: expense.id,
    description: expense.description,
    status: expense.status,
    category: expense.category?.name || null,
    employee: ownerName(expense),
    amount: Number.isFinite(amount) ? amount : null,
    currency: expense.currency,
    baseCurrency: base,
    convertedAmount: fxInfo?.convertedAmount ?? null,
    fxRate: fxInfo?.rate ?? null,
    expenseDate: expense.expenseDate,
    updatedAt: expense.updatedAt
  };
}

router.get('/pending', async (req, res) => {
  try {
    const companyId = await companyOf(req.query.me);
    if (!companyId) return res.json([]);
    const base = await companyBaseCurrency(companyId);

    const rows = await prisma.expense.findMany({
      where: {
        companyId,
        status: { in: INBOX_STATUSES }
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        user: { select: { firstName: true, lastName: true } },
        category: { select: { name: true } }
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200
    });

    const mapped = await Promise.all(rows.map(async (expense) => {
      const fx = await ensureConverted(expense, base);
      return mapExpense(expense, base, fx);
    }));

    res.json(mapped);
  } catch (e) { console.error(e); res.status(500).json({ error: 'pending_failed' }); }
});

router.get('/history', async (req, res) => {
  try {
    const companyId = await companyOf(req.query.me);
    if (!companyId) return res.json([]);
    const base = await companyBaseCurrency(companyId);
    const rows = await prisma.expense.findMany({
      where: {
        companyId,
        status: { in: [ExpenseStatus.APPROVED, ExpenseStatus.REJECTED] }
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        user: { select: { firstName: true, lastName: true } },
        category: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 200
    });

    const mapped = await Promise.all(rows.map(async (expense) => {
      const fx = await ensureConverted(expense, base);
      return mapExpense(expense, base, fx);
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
        employee: { select: { firstName: true, lastName: true } },
        user: { select: { firstName: true, lastName: true } },
        category: { select: { name: true } }
      }
    });

    const base = await companyBaseCurrency(expense.companyId);
    const fx = await ensureConverted(expense, base);

    res.json(mapExpense(expense, base, fx));
  } catch (e) { console.error(e); res.status(500).json({ error: 'decision_failed' }); }
});

module.exports = router;
