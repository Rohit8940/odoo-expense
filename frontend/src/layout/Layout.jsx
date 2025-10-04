import { Box } from '@mui/material'
import Sidebar from './Sidebar'
import Topbar from './Topbar'


export default function Layout({ children }) {
return (
<Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
<Sidebar />
<Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
<Topbar />
<Box sx={{ p: 2 }}>{children}</Box>
</Box>
</Box>
)
}