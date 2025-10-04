const { prisma } = require('../prisma');
const fetch = require('node-fetch');

async function resolveCurrency(countryCode) {
  try {
    const url = 'https://restcountries.com/v3.1/alpha/' + countryCode + '?fields=currencies';
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Currency lookup failed with status ' + res.status);
    }
    const data = await res.json();
    const currencies = Array.isArray(data) && data[0] && data[0].currencies;
    if (currencies) {
      const firstCode = Object.keys(currencies)[0];
      if (firstCode) return firstCode;
    }
  } catch (err) {
    console.warn('Falling back to default currency code', err.message);
  }
  return 'USD';
}

async function createCompanyWithAdmin({ companyName, countryCode, adminEmail, passwordHash, fullName }) {
  const currencyCode = await resolveCurrency(countryCode);

  const company = await prisma.company.create({
    data: {
      name: companyName,
      countryCode,
      currencyCode,
      isManagerApprover: true
    }
  });

  const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: passwordHash,
      fullName,
      roleId: adminRole.id,
      companyId: company.id
    }
  });

  await prisma.approvalStage.createMany({
    data: [
      { companyId: company.id, order: 1, name: 'Manager', isActive: true, approverRoleId: await roleId('MANAGER') },
      { companyId: company.id, order: 2, name: 'Finance', isActive: true, approverRoleId: await roleId('MANAGER') },
      { companyId: company.id, order: 3, name: 'Director', isActive: true, approverRoleId: await roleId('MANAGER') }
    ]
  });

  await prisma.approvalRule.create({
    data: {
      companyId: company.id,
      ruleType: 'HYBRID',
      percentageNeeded: 60,
      orLogic: true,
      isActive: false
    }
  });

  return { company, admin };

  async function roleId(name) {
    const r = await prisma.role.findFirst({ where: { name } });
    return r ? r.id : null;
  }
}

module.exports = { createCompanyWithAdmin };
