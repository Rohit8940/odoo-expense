export const landingRoute = (role) =>
  role === 'ADMIN' ? '/admin/users'
  : role === 'MANAGER' ? '/approvals/inbox'
  : '/expenses/me';