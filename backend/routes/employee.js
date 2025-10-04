const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const axios = require("axios");

// Middleware: simple auth simulation
async function companyIdFromUser(userId) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  return u?.companyId;
}

// GET /api/employee/expenses?me=<userId>
router.get("/expenses", async (req, res) => {
  try {
    const userId = req.query.me;
    const expenses = await prisma.expense.findMany({
      where: { userId },
      include: { approvals: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(expenses);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "fetch_expenses_failed" });
  }
});

// POST /api/employee/expenses  (create new)
router.post("/expenses", upload.single("receipt"), async (req, res) => {
  try {
    const { userId, description, category, currency, amount, date, remarks } =
      req.body;
    const companyId = await companyIdFromUser(userId);

    const expense = await prisma.expense.create({
      data: {
        description,
        category,
        currency,
        amount: parseFloat(amount),
        expenseDate: new Date(date),
        remarks,
        userId,
        companyId,
        status: "DRAFT",
        receiptPath: req.file?.path || null,
      },
    });
    res.status(201).json(expense);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "create_expense_failed" });
  }
});

// PATCH /api/employee/expenses/:id/submit → move to waiting approval
router.patch("/expenses/:id/submit", async (req, res) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: { status: "WAITING_APPROVAL" },
    });
    res.json(expense);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "submit_expense_failed" });
  }
});

// Currency conversion API (for manager later)
router.get("/convert", async (req, res) => {
  try {
    const { amount, from, to } = req.query;
    const resp = await axios.get(
      `https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=${amount}`
    );
    res.json({ result: resp.data.result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "conversion_failed" });
  }
});

module.exports = router;
