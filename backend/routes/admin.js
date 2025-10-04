const router = require('express').Router();
const { PrismaClient, Role, ApprovalRuleType } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const { sendMail } = require('../lib/mailer');


// helper: company scope via user id (replace with auth middleware later)
async function companyIdFromUser(userId) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  return u?.companyId;
}

/**
 * USERS
 */

// GET /api/admin/users?me=<adminUserId>
router.get('/users', async (req, res) => {
  try {
    const companyId = await companyIdFromUser(req.query.me);
    if (!companyId) return res.status(400).json({ error: 'bad_scope' });
    const users = await prisma.user.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, managerId: true }
    });
    res.json(users);
  } catch (e) { console.error(e); res.status(500).json({ error: 'list_users_failed' }); }
});

// POST /api/admin/users  { me, firstName, lastName, email, role, managerId? }
router.post('/users', async (req, res) => {
  try {
    const { me, firstName, lastName, email, role, managerId } = req.body;
    const companyId = await companyIdFromUser(me);
    if (!companyId) return res.status(400).json({ error: 'bad_scope' });
    const temp = Math.random().toString(36).slice(2, 10);
    const passwordHash = await bcrypt.hash(temp, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName: lastName || '',
        email,
        role,
        managerId: managerId || null,
        companyId,
        passwordHash,
        passwordHash, mustChangePassword: true
      }
    });

    await sendMail(
      email,
      'Your new account on Expense Management',
      `<p>Hello ${firstName},</p>
       <p>Your account has been created. Temporary password: <b>${temp}</b></p>
       <p>Please login and change your password.</p>`
    );

    return res.status(201).json({ user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'create_user_failed' });
  }
});


// PATCH /api/admin/users/:id  { role?, managerId? }
// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req, res) => {
  try {
    const { role, managerId } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role, managerId }
    });
    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'update_user_failed' });
  }
});


// POST /api/admin/users/:id/send-password  -> resets to new random

// POST /api/admin/users/:id/send-password
router.post('/users/:id/send-password', async (req, res) => {
  try {
    const temp = Math.random().toString(36).slice(2, 10);
    const passwordHash = await bcrypt.hash(temp, 10);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash,  mustChangePassword: true },
      select: { email: true, firstName: true }
    });

    if (!user?.email) return res.status(404).json({ error: 'user_not_found' });

    await sendMail(
      user.email,
      'Your password has been reset',
      `<p>Hello ${user.firstName || ''},</p>
       <p>Your temporary password is: <b>${temp}</b></p>
       <p>Please log in and update your password after signing in.</p>`
    );

    // only return ok, don't expose temp in API
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'reset_password_failed' });
  }
});


/**
 * APPROVAL RULES (Flows + Policy)
 */

// GET /api/admin/flow?me=<adminUserId>&name=<flowName>
router.get('/flow', async (req, res) => {
  try {
    const companyId = await companyIdFromUser(req.query.me);
    const name = req.query.name || 'Standard';
    const flow = await prisma.approvalFlow.findFirst({
      where: { companyId, name },
      include: { steps: { orderBy: { order: 'asc' } } }
    });
    const policy = flow
      ? await prisma.approvalPolicy.findUnique({ where: { flowId: flow.id } })
      : null;
    res.json({ flow, policy });
  } catch (e) { console.error(e); res.status(500).json({ error: 'get_flow_failed' }); }
});

// POST /api/admin/flow  { me, name, useManagerAsFirstApprover, isSequential, approvers:[{userId, required}], requiredPercent?, specificApproverId? }
router.post('/flow', async (req, res) => {
  try {
    const { me, name, useManagerAsFirstApprover, isSequential, approvers, requiredPercent, specificApproverId } = req.body;
    const companyId = await companyIdFromUser(me);
    if (!companyId) return res.status(400).json({ error: 'bad_scope' });

    const existing = await prisma.approvalFlow.findFirst({ where: { companyId, name } });

    const savedFlow = existing
      ? await prisma.approvalFlow.update({
          where: { id: existing.id },
          data: {
            description: description || null,
            useManagerAsFirstApprover: !!useManagerAsFirstApprover,
            isSequential: !!isSequential,
            steps: {
              deleteMany: {}, // reset steps
              create: approvers.map((a, i) => ({
                order: i + 1,
                approverUserId: a.userId,
                label: `Step ${i + 1}`,
                isRequired: a.required ?? true
              }))
            }
          },
          include: { steps: true }
        })
      : await prisma.approvalFlow.create({
          data: {
            companyId,
            name,
            useManagerAsFirstApprover: !!useManagerAsFirstApprover,
            isSequential: !!isSequential,
            steps: {
              create: approvers.map((a, i) => ({
                order: i + 1,
                approverUserId: a.userId,
                label: `Step ${i + 1}`,
                isRequired: a.required ?? true
              }))
            }
          },
          include: { steps: true }
        });

    await prisma.approvalPolicy.upsert({
      where: { flowId: savedFlow.id },
      update: { type: ApprovalRuleType.HYBRID, requiredPercent: requiredPercent ?? null, specificApproverId: specificApproverId ?? null, active: true },
      create: {
        companyId,
        flowId: savedFlow.id,
        type: ApprovalRuleType.HYBRID,
        requiredPercent: requiredPercent ?? null,
        specificApproverId: specificApproverId ?? null,
        active: true
      }
    });

    res.status(201).json({ flow: savedFlow });
  } catch (e) { console.error(e); res.status(500).json({ error: 'save_flow_failed' }); }
});

// GET /api/admin/candidates?me=<adminUserId>
// routes/admin.js -> GET /api/admin/candidates
router.get('/candidates', async (req, res) => {
  try {
    const companyId = await companyIdFromUser(req.query.me);
    const users = await prisma.user.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, managerId: true }
    });
    res.json(users);
  } catch (e) { console.error(e); res.status(500).json({ error: 'candidates_failed' }); }
});

module.exports = router;
