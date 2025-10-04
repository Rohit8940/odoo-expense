const { PrismaClient, Role } = require('@prisma/client');
const prisma = new PrismaClient();

async function createFixtures() {
  const company = await prisma.company.create({
    data: { name: 'TestCo', country: 'India', defaultCurrency: 'INR' }
  });
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.local',
      passwordHash: 'x', // not used
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      companyId: company.id
    }
  });
  const target = await prisma.user.create({
    data: {
      email: 'employee@test.local',
      passwordHash: 'y',
      firstName: 'Emp',
      lastName: 'One',
      role: Role.EMPLOYEE,
      companyId: company.id
    }
  });
  return { prisma, company, admin, target };
}

async function cleanup(companyId) {
  await prisma.approvalPolicy.deleteMany({ where: { companyId } });
  await prisma.approvalFlowStep.deleteMany({
    where: { flow: { companyId } }
  });
  await prisma.approvalFlow.deleteMany({ where: { companyId } });
  await prisma.user.deleteMany({ where: { companyId } });
  await prisma.company.delete({ where: { id: companyId } });
}

module.exports = { prisma, createFixtures, cleanup };
