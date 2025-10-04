import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewExpense from './pages/expenses/NewExpense'
import MyExpenses from './pages/expenses/MyExpenses'
import Inbox from './pages/approvals/Inbox'
import Users from './pages/admin/Users'
import Rules from './pages/admin/Rules'
import { useAuth } from './context/authProvider'


function RequireAuth({ roles, children }) {
const { user, ready } = useAuth()
if (!ready) return null
if (!user) return <Navigate to="/login" replace />
if (roles && roles.length) {
const role = user.role?.name || user.role
if (!roles.includes(role)) return <Navigate to="/" replace />
}
return children
}


export default function App() {
return (
<Routes>
<Route path="/login" element={<Login />} />


<Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
<Route path="/expenses/new" element={<RequireAuth><NewExpense /></RequireAuth>} />
<Route path="/expenses/me" element={<RequireAuth><MyExpenses /></RequireAuth>} />


<Route path="/approvals/inbox" element={<RequireAuth roles={["ADMIN","MANAGER"]}><Inbox /></RequireAuth>} />


<Route path="/admin/users" element={<RequireAuth roles={["ADMIN"]}><Users /></RequireAuth>} />
<Route path="/admin/rules" element={<RequireAuth roles={["ADMIN"]}><Rules /></RequireAuth>} />
</Routes>
)
}