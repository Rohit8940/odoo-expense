// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn.jsx';                 // or Login, but be consistent
import Dashboard from './pages/Dashboard.jsx';
import NewExpense from './pages/expenses/NewExpense.jsx';
import MyExpenses from './pages/expenses/MyExpenses.jsx';
import Inbox from './pages/approvals/Inbox.jsx';
import Users from './pages/AdminUsers.jsx';
import Rules from './pages/AdminApprovalRules.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import EmployeeExpenses from './pages/EmployeeExpensePage.jsx';
import { useAuth } from './providers/AuthProvider.jsx';  // unify source

function RequireAuth({ roles, children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles?.length) {
    const role = user.role?.name || user.role;
    if (!roles.includes(role)) return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<SignIn />} />

      {/* Protected */}
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/expenses/new" element={<RequireAuth><NewExpense /></RequireAuth>} />
      <Route path="/expenses/me" element={<RequireAuth><EmployeeExpenses /></RequireAuth>} />
      <Route path="/approvals/inbox" element={<RequireAuth roles={['ADMIN','MANAGER']}><Inbox /></RequireAuth>} />
      <Route path="/admin/users" element={<RequireAuth roles={['ADMIN']}><Users /></RequireAuth>} />
      <Route path="/admin/rules" element={<RequireAuth roles={['ADMIN']}><Rules /></RequireAuth>} />
      <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
