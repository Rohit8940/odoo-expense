import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import Layout from '../../layout/Layout'
import DataTable from '../../components/DataTable'
import { api } from '../../lib/api'


export default function MyExpenses() {
const [rows, setRows] = useState([])


useEffect(() => { api('/expenses/me').then(setRows).catch(()=>setRows([])) }, [])


const cols = [
{ key: 'expenseDate', label: 'Date', render: r => new Date(r.expenseDate).toLocaleDateString() },
{ key: 'category', label: 'Category' },
{ key: 'description', label: 'Description' },
{ key: 'amountInCompanyCcy', label: 'Amount (Company)' },
{ key: 'status', label: 'Status' }
]


return (
<Layout>
<Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>My Expenses</Typography>
<Box>
<DataTable columns={cols} rows={rows} />
</Box>
</Layout>
)
}