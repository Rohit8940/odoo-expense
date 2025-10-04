const { Router } = require('express');
const { prisma } = require('../prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { toCompanyCurrency } = require('../lib/currency');

const router = Router();

router.post('/', requireAuth, requireRole(['EMPLOYEE','MANAGER','ADMIN']), async (req, res) => {
  try {
    const user = req.user;
    const { amount, currency, category, description, expenseDate, receiptUrl, submit } = req.body;

    const company = await prisma.company.findUnique({ where: { id: user.companyId } });
    if (!company) return res.status(400).json({ error: 'Company not found' });

    const converted = await toCompanyCurrency(Number(amount), currency, company.currencyCode);

    const expense = await prisma.expense.create({
      data: {
        companyId: company.id,
        employeeId: user.id,
        amountOriginal: amount,
        currencyOriginal: currency,
        amountInCompanyCcy: converted,
        category,
        description,
        expenseDate: new Date(expenseDate),
        receiptUrl: receiptUrl || null,
        status: submit ? 'SUBMITTED' : 'DRAFT',
        currentStageOrder: submit ? 1 : null
      }
    });

    res.json(expense);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const list = await prisma.expense.findMany({
    where: { employeeId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });
  res.json(list);
});

module.exports = router;
