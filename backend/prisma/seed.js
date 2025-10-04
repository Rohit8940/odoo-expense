// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Roles
  const [ADMIN, MANAGER, EMPLOYEE] = await Promise.all(
    ['ADMIN', 'MANAGER', 'EMPLOYEE'].map(name =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );

  // 2. Company
  const company = await prisma.company.create({
    data: {
      name: 'DemoCo',
      countryCode: 'IN',
      currencyCode: 'INR',
      isManagerApprover: true,
    },
  });

  // 3. Users
  const admin = await prisma.user.create({
    data: {
      fullName: 'Admin User',
      email: 'admin@demo.co',
      password: 'admin123', // hash this in real life
      roleId: ADMIN.id,
      companyId: company.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      fullName: 'Manager User',
      email: 'manager@demo.co',
      password: 'manager123',
      roleId: MANAGER.id,
      companyId: company.id,
    },
  });

  const employee = await prisma.user.create({
    data: {
      fullName: 'Employee User',
      email: 'employee@demo.co',
      password: 'employee123',
      roleId: EMPLOYEE.id,
      companyId: company.id,
    },
  });

  // 4. EmployeeProfile linking employee → manager
  await prisma.employeeProfile.create({
    data: {
      userId: employee.id,
      companyId: company.id,
      managerUserId: manager.id,
    },
  });

  // 5. ApprovalStages (Manager → Finance → Director)
  await prisma.approvalStage.createMany({
    data: [
      {
        companyId: company.id,
        order: 1,
        name: 'Manager',
        isActive: true,
        approverRoleId: MANAGER.id,
      },
      {
        companyId: company.id,
        order: 2,
        name: 'Finance',
        isActive: true,
        approverRoleId: MANAGER.id, // you can add a FINANCE role later
      },
      {
        companyId: company.id,
        order: 3,
        name: 'Director',
        isActive: true,
        approverRoleId: MANAGER.id, // or use a specific user
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed data created:');
  console.log({ admin, manager, employee, company });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
