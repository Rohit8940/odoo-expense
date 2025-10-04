const { Router } = require('express');
const { prisma } = require('../prisma');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/inbox', requireAuth, async (req, res) => {
  const items = await eligibleApprovalsForUser(req.user.id);
  res.json(items);
});

router.post('/:expenseId/decision', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { expenseId } = req.params;
    const { approved, comment } = req.body;

    const expense = await prisma.expense.findUnique({
      where: { id: Number(expenseId) },
      include: {
        company: { include: { approvalRules: true, approvalStages: true } },
        employee: { include: { employeeProfile: true } }
      }
    });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (!['SUBMITTED','IN_REVIEW'].includes(expense.status))
      return res.status(400).json({ error: 'Expense not pending approval' });

    await prisma.expenseApproval.create({
      data: {
        expenseId: expense.id,
        stageOrder: expense.currentStageOrder || null,
        approverId: user.id,
        approved,
        comment: comment || null,
        decidedAt: new Date()
      }
    });

    // Stage logic
    const approvals = await prisma.expenseApproval.findMany({ where: { expenseId: expense.id } });
    const totalStages = expense.company.approvalStages.filter(s => s.isActive).length;
    const currentStage = expense.company.approvalStages.find(s => s.order === expense.currentStageOrder);

    // Rejection kills it
    const stageApprovals = approvals.filter(a => a.stageOrder === expense.currentStageOrder);
    if (stageApprovals.some(a => a.approved === false)) {
      await prisma.expense.update({ where: { id: expense.id }, data: { status: 'REJECTED', currentStageOrder: null } });
      return res.json({ status: 'REJECTED' });
    }

    const passesConditional = await evaluateConditionalRules(expense.company.approvalRules, approvals, expense);

    const nextOrder = (expense.currentStageOrder || 0) + 1;
    if (approved && (passesConditional || nextOrder > totalStages)) {
      if (nextOrder > totalStages) {
        await prisma.expense.update({ where: { id: expense.id }, data: { status: 'APPROVED', currentStageOrder: null } });
        return res.json({ status: 'APPROVED' });
      }
      await prisma.expense.update({ where: { id: expense.id }, data: { status: 'IN_REVIEW', currentStageOrder: nextOrder } });
      return res.json({ status: 'IN_REVIEW', currentStageOrder: nextOrder });
    }

    // Sit tight in current stage
    const still = await prisma.expense.update({ where: { id: expense.id }, data: { status: 'IN_REVIEW' } });
    res.json({ status: still.status, currentStageOrder: still.currentStageOrder });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

/* Helpers */
async function eligibleApprovalsForUser(userId) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true, employeeProfile: true, role: true }
  });
  if (!me) return [];

  const stages = await prisma.approvalStage.findMany({
    where: { companyId: me.companyId, isActive: true },
    include: { approverRole: true, approverUser: true }
  });

  const expenses = await prisma.expense.findMany({
    where: { companyId: me.companyId, status: 'IN_REVIEW' },
    include: { employee: { include: { employeeProfile: true } } }
  });

  return expenses.filter(exp => {
    const stage = stages.find(s => s.order === exp.currentStageOrder);
    if (!stage) return false;

    if (stage.approverUserId) return stage.approverUserId === userId;

    if (stage.approverRoleId) {
      const isManagerStage = stage.approverRole?.name === 'MANAGER';
      if (isManagerStage) {
        const mgrId = exp.employee.employeeProfile && exp.employee.employeeProfile.managerUserId;
        return mgrId === userId;
      }
      return me.role && me.role.name === stage.approverRole.name;
    }
    return false;
  });
}

async function evaluateConditionalRules(rules, approvals, expense) {
  if (!rules || !rules.length) return false;
  const yes = approvals.filter(a => a.approved).length;
  const total = approvals.length || 1;
  const yesPct = (yes / total) * 100;
  const approverIds = approvals.filter(a => a.approved).map(a => a.approverId);

  for (const r of rules) {
    if (!r.isActive) continue;

    const inRange =
      (!r.minAmountCompanyCcy || expense.amountInCompanyCcy >= r.minAmountCompanyCcy) &&
      (!r.maxAmountCompanyCcy || expense.amountInCompanyCcy <= r.maxAmountCompanyCcy);
    if (!inRange) continue;

    if (r.ruleType === 'PERCENTAGE') {
      if (yesPct >= (r.percentageNeeded || 100)) return true;
    } else if (r.ruleType === 'SPECIFIC_APPROVER') {
      if (r.specificUserId && approverIds.includes(r.specificUserId)) return true;
    } else if (r.ruleType === 'HYBRID') {
      const pctOK = yesPct >= (r.percentageNeeded || 100);
      const specOK = r.specificUserId && approverIds.includes(r.specificUserId);
      if (r.orLogic ? (pctOK || specOK) : (pctOK && specOK)) return true;
    }
  }
  return false;
}
