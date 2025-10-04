import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material'
import DashboardIcon from '@mui/icons-material/SpaceDashboard'
import ReceiptIcon from '@mui/icons-material/ReceiptLong'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import SettingsIcon from '@mui/icons-material/ManageAccounts'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authProvider'


const Item = ({ to, icon, label }) => {
const loc = useLocation()
const active = loc.pathname === to
return (
<ListItemButton component={NavLink} to={to} selected={active} sx={{ borderRadius: 2, mb: 0.5 }}>
<ListItemIcon>{icon}</ListItemIcon>
<ListItemText primary={label} />
</ListItemButton>
)
}


export default function Sidebar() {
const { user } = useAuth()
const role = user?.role?.name || user?.role


return (
<Box sx={{ width: 260, bgcolor: 'white', height: '100vh', position: 'sticky', top: 0, borderRight: '1px solid #eef0f4', p: 2 }}>
<Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Expense</Typography>
<List>
<Item to="/" icon={<DashboardIcon />} label="Dashboard" />
<Item to="/expenses/new" icon={<ReceiptIcon />} label="New Expense" />
<Item to="/expenses/me" icon={<ReceiptIcon />} label="My Expenses" />
{(role === 'ADMIN' || role === 'MANAGER') && <Item to="/approvals/inbox" icon={<TaskAltIcon />} label="Approvals" />}
</List>
{role === 'ADMIN' && (
<>
<Typography variant="overline" sx={{ mt: 2, color: 'text.secondary', display: 'block' }}>Admin</Typography>
<List>
<Item to="/admin/users" icon={<SettingsIcon />} label="Users" />
<Item to="/admin/rules" icon={<SettingsIcon />} label="Rules" />
</List>
</>
)}
</Box>
)
}