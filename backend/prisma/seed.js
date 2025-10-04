const { PrismaClient, Role, ApprovalRuleType, ExpenseStatus, ApprovalDecision } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { name: 'Acme Corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      country: 'India',
      defaultCurrency: 'INR'
    }
  });

  const adminPwd = await bcrypt.hash('admin123', 10);
  const mgrPwd = await bcrypt.hash('manager123', 10);
  const empPwd = await bcrypt.hash('employee123', 10);
  const cfoPwd = await bcrypt.hash('cfo123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@acme.test' },
    update: {
      passwordHash: adminPwd,
      firstName: 'Ada',
      lastName: 'Admin',
      role: Role.ADMIN,
      companyId: company.id,
      isManagerApprover: true,
      mustChangePassword: false
    },
    create: {
      email: 'admin@acme.test',
      passwordHash: adminPwd,
      firstName: 'Ada',
      lastName: 'Admin',
      role: Role.ADMIN,
      companyId: company.id,
      isManagerApprover: true,
      mustChangePassword: false
    }
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@acme.test' },
    update: {
      passwordHash: mgrPwd,
      firstName: 'Max',
      lastName: 'Manager',
      role: Role.MANAGER,
      companyId: company.id,
      isManagerApprover: true,
      mustChangePassword: false
    },
    create: {
      email: 'manager@acme.test',
      passwordHash: mgrPwd,
      firstName: 'Max',
      lastName: 'Manager',
      role: Role.MANAGER,
      companyId: company.id,
      isManagerApprover: true,
      mustChangePassword: false
    }
  });

  const cfo = await prisma.user.upsert({
    where: { email: 'cfo@acme.test' },
    update: {
      passwordHash: cfoPwd,
      firstName: 'Chloe',
      lastName: 'CFO',
      role: Role.MANAGER,
      companyId: company.id,
      isManagerApprover: true,
      mustChangePassword: false
    },
    create: {
      email: 'cfo@acme.test',
      passwordHash: cfoPwd,
      firstName: 'Chloe',
      lastName: 'CFO',
      role: Role.MANAGER,
      companyId: company.id,
      isManagerApprover: true,
      mustChangePassword: false
    }
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@acme.test' },
    update: {
      passwordHash: empPwd,
      firstName: 'Evan',
      lastName: 'Employee',
      role: Role.EMPLOYEE,
      companyId: company.id,
      managerId: manager.id,
      mustChangePassword: false
    },
    create: {
      email: 'employee@acme.test',
      passwordHash: empPwd,
      firstName: 'Evan',
      lastName: 'Employee',
      role: Role.EMPLOYEE,
      companyId: company.id,
      managerId: manager.id,
      mustChangePassword: false
    }
  });

  const travel = await prisma.expenseCategory.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Travel' } },
    update: {},
    create: { companyId: company.id, name: 'Travel' }
  });

  const meals = await prisma.expenseCategory.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Meals' } },
    update: {},
    create: { companyId: company.id, name: 'Meals', perTxnLimit: 5000 }
  });

  const flow = await prisma.approvalFlow.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Standard' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Standard',
      useManagerAsFirstApprover: true,
      steps: {
        create: [
          { order: 1, approverUserId: manager.id, label: 'Manager' },
          { order: 2, approverUserId: cfo.id, label: 'Finance/CFO', isFinalGate: true }
        ]
      }
    }
  });

  await prisma.approvalPolicy.upsert({
    where: { flowId: flow.id },
    update: {
      requiredPercent: 60,
      specificApproverId: cfo.id,
      active: true
    },
    create: {
      companyId: company.id,
      flowId: flow.id,
      type: ApprovalRuleType.HYBRID,
      requiredPercent: 60,
      specificApproverId: cfo.id,
      active: true
    }
  });

  const expense = await prisma.expense.create({
    data: {
      employeeId: employee.id,
      companyId: company.id,
      amount: 100.00,
      currency: 'USD',
      amountInCompanyCcy: 8300.00,
      conversionRate: 83.0,
      categoryId: meals.id,
      description: 'Team lunch',
      expenseDate: new Date(),
      status: ExpenseStatus.IN_REVIEW,
      flowId: flow.id,
      approvals: {
        create: [
          { stepOrder: 1, approverUserId: manager.id, decision: ApprovalDecision.APPROVED, comments: 'OK', decidedAt: new Date() },
          { stepOrder: 2, approverUserId: cfo.id, decision: ApprovalDecision.PENDING }
        ]
      },
      receipt: {
        create: {
          fileUrl: 'https://example.com/receipts/123.png',
          ocrRawText: 'The Diner\nAmount: 100.00 USD\nDate: 2025-10-01',
          merchantName: 'The Diner',
          amount: 100.00,
          currency: 'USD',
          purchaseDate: new Date()
        }
      }
    }
  });

  await prisma.expenseLine.createMany({
    data: [
      { expenseId: expense.id, label: 'Food', amount: 80.00, currency: 'USD' },
      { expenseId: expense.id, label: 'Tip', amount: 20.00, currency: 'USD' }
    ]
  });

  console.log('Seed complete');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
