import { createTheme } from '@mui/material/styles'


export const theme = createTheme({
palette: {
mode: 'light',
primary: { main: '#4F46E5' },
secondary: { main: '#0EA5E9' },
background: { default: '#f7f8fb' }
},
shape: { borderRadius: 14 },
components: {
MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } }
}
})