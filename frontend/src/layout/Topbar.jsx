import { AppBar, Avatar, Box, IconButton, Toolbar, Typography } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../context/authProvider'


export default function Topbar() {
const { user, logout } = useAuth()
return (
<AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #eef0f4', backdropFilter: 'blur(6px)' }}>
<Toolbar>
<Typography sx={{ flex: 1, fontWeight: 600 }}>Expense Management</Typography>
<Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
<Typography variant="body2" color="text.secondary">{user?.fullName}</Typography>
<Avatar sx={{ width: 32, height: 32 }}>{user?.fullName?.[0] || 'U'}</Avatar>
<IconButton onClick={logout}><LogoutIcon /></IconButton>
</Box>
</Toolbar>
</AppBar>
)
}