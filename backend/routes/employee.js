const router = require('express').Router();
const { PrismaClient, ExpenseStatus, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({ dest: uploadsDir });
const { getRate } = require('../lib/fx');

async function employeeContext(userId) {
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyId: true,
      company: { select: { defaultCurrency: true } }
    }
  });
}

async function decorateExpense(expense, baseCurrency) {
  const approvals = expense.approvals?.map((appr) => ({
    id: appr.id,
    stepOrder: appr.stepOrder,
    approver: appr.approverUser
      ? `${appr.approverUser.firstName || ''} ${appr.approverUser.lastName || ''}`.trim()
      : appr.approverRole || null,
    decision: appr.decision,
    comments: appr.comments,
    decidedAt: appr.decidedAt
  })) || [];

  let conversionRate = expense.conversionRate ? Number(expense.conversionRate) : null;
  let convertedAmount = expense.amountInCompanyCcy ? Number(expense.amountInCompanyCcy) : null;

  if (!conversionRate || !convertedAmount) {
    conversionRate = await getRate(expense.currency, baseCurrency);
    convertedAmount = Number(expense.amount) * conversionRate;
  }

  return {
    id: expense.id,
    description: expense.description,
    amount: Number(expense.amount),
    currency: expense.currency,
    convertedAmount: Math.round(convertedAmount * 100) / 100,
    conversionRate,
    baseCurrency,
    status: expense.status,
    expenseDate: expense.expenseDate,
    category: expense.category
      ? { id: expense.category.id, name: expense.category.name }
      : null,
    receipt: expense.receipt
      ? { id: expense.receipt.id, fileUrl: expense.receipt.fileUrl }
      : null,
    approvals,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt
  };
}

function normaliseAmount(raw) {
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return Number.parseFloat(num.toFixed(2));
}

router.get('/expenses', async (req, res) => {
  try {
    const employeeId = req.query.me;
    const ctx = await employeeContext(employeeId);
    if (!ctx?.companyId) {
      return res.status(404).json({ error: 'employee_not_found' });
    }

    const baseCurrency = ctx.company.defaultCurrency;

    const [categories, expenses] = await Promise.all([
      prisma.expenseCategory.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, perTxnLimit: true }
      }),
      prisma.expense.findMany({
        where: { employeeId },
        include: {
          category: { select: { id: true, name: true } },
          approvals: {
            orderBy: { stepOrder: 'asc' },
            include: { approverUser: { select: { firstName: true, lastName: true } } }
          },
          receipt: true
        },
        orderBy: { expenseDate: 'desc' }
      })
    ]);

    const mapped = await Promise.all(
      expenses.map((exp) => decorateExpense(exp, baseCurrency))
    );

    const totals = mapped.reduce(
      (acc, exp) => {
        if (exp.status === ExpenseStatus.DRAFT) {
          acc.toSubmit += exp.convertedAmount;
        } else if (
          exp.status === ExpenseStatus.SUBMITTED ||
          exp.status === ExpenseStatus.IN_REVIEW
        ) {
          acc.waiting += exp.convertedAmount;
        } else if (exp.status === ExpenseStatus.APPROVED) {
          acc.approved += exp.convertedAmount;
        }
        return acc;
      },
      { toSubmit: 0, waiting: 0, approved: 0 }
    );

    const format = (val) => Math.round(val * 100) / 100;

    res.json({
      employee: {
        id: ctx.id,
        name: `${ctx.firstName || ''} ${ctx.lastName || ''}`.trim()
      },
      baseCurrency,
      categories,
      totals: {
        toSubmit: format(totals.toSubmit),
        waiting: format(totals.waiting),
        approved: format(totals.approved)
      },
      expenses: mapped
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'fetch_expenses_failed' });
  }
});

router.post('/expenses', upload.single('receipt'), async (req, res) => {
  try {
    const employeeId = req.body.employeeId || req.body.userId;
    const ctx = await employeeContext(employeeId);
    if (!ctx?.companyId) {
      return res.status(400).json({ error: 'bad_scope' });
    }

    const {
      description,
      categoryId,
      currency,
      amount,
      expenseDate
    } = req.body;

    const amountNumber = normaliseAmount(amount);
    if (amountNumber === null) {
      return res.status(400).json({ error: 'invalid_amount' });
    }

    if (!currency) {
      return res.status(400).json({ error: 'currency_required' });
    }

    const baseCurrency = ctx.company.defaultCurrency;
    const fxRate = await getRate(currency, baseCurrency);
    const converted = normaliseAmount(amountNumber * fxRate);

    const data = {
      employeeId,
      companyId: ctx.companyId,
      description: description || '',
      categoryId: categoryId || null,
      amount: new Prisma.Decimal(amountNumber.toFixed(2)),
      currency,
      amountInCompanyCcy: converted !== null ? new Prisma.Decimal(converted.toFixed(2)) : null,
      conversionRate: fxRate ? new Prisma.Decimal(fxRate.toFixed(6)) : null,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      status: ExpenseStatus.DRAFT
    };

    if (req.file) {
      const relative = path.relative(path.join(__dirname, '..'), req.file.path);
      data.receipt = {
        create: {
          fileUrl: relative.replace(/\\/g, '/'),
          createdAt: new Date()
        }
      };
    }

    const expense = await prisma.expense.create({
      data,
      include: {
        category: { select: { id: true, name: true } },
        approvals: {
          orderBy: { stepOrder: 'asc' },
          include: { approverUser: { select: { firstName: true, lastName: true } } }
        },
        receipt: true
      }
    });

    const response = await decorateExpense(expense, baseCurrency);
    res.status(201).json(response);
  } catch (e) {
    console.error(e);
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: 'create_expense_failed' });
  }
});

router.patch('/expenses/:id/submit', async (req, res) => {
  try {
    const employeeId = req.body.me || req.body.employeeId;
    const ctx = await employeeContext(employeeId);
    if (!ctx?.companyId) {
      return res.status(400).json({ error: 'bad_scope' });
    }

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: { status: ExpenseStatus.SUBMITTED },
      include: {
        category: { select: { id: true, name: true } },
        approvals: {
          orderBy: { stepOrder: 'asc' },
          include: { approverUser: { select: { firstName: true, lastName: true } } }
        },
        receipt: true
      }
    });

    const response = await decorateExpense(expense, ctx.company.defaultCurrency);
    res.json(response);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'submit_expense_failed' });
  }
});

module.exports = router;
