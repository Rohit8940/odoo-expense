import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './providers/AuthProvider.jsx';
import SignUp from './pages/SignUp.jsx';
import SignIn from './pages/SignIn.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminApprovalRules from './pages/AdminApprovalRules.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import EmployeeExpensePage from './pages/EmployeeExpensePage.jsx';
import ChangePassword from './pages/ChangePassword.jsx';

const landingRoute = (role) => {
  switch (role) {
    case 'ADMIN':
      return '/admin/users';
    case 'MANAGER':
      return '/manager/dashboard';
    case 'EMPLOYEE':
    default:
      return '/employee/expenses';
  }
};

function Private({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function Landing() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={landingRoute(user.role)} replace />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/" element={<Private><Landing /></Private>} />
          <Route path="/admin/users" element={<Private><AdminUsers /></Private>} />
          <Route path="/admin/approval" element={<Private><AdminApprovalRules /></Private>} />
          <Route path="/approvals/inbox" element={<Private><ManagerDashboard /></Private>} />
          <Route path="/employee/expenses" element={<Private><EmployeeExpensePage /></Private>} />
          <Route path="/change-password" element={<Private><ChangePassword /></Private>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
