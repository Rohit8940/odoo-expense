import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import Layout from '../../layout/Layout'
import { api } from '../../lib/api'


export default function Inbox() {
const [items, setItems] = useState([])


useEffect(() => { refresh() }, [])


async function refresh() {
const list = await api('/approvals/inbox')
setItems(list || [])
}


async function decide(id, approved, comment) {
await api(`/approvals/${id}/decision`, { method: 'POST', body: JSON.stringify({ approved, comment }) })
setItems(prev => prev.filter(x => x.id !== id))
}


return (
<Layout>
<Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Approvals</Typography>
<Stack spacing={2}>
{items.map(exp => (
<Card key={exp.id} elevation={0} sx={{ border: '1px solid #eef0f4' }}>
<CardContent>
<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{exp.category} • {Number(exp.amountInCompanyCcy)} {exp.company?.currencyCode || ''}</Typography>
<Typography variant="body2" color="text.secondary">{exp.description}</Typography>
<Box sx={{ mt: 1 }}>
<Typography variant="caption" color="text.secondary">Date: {new Date(exp.expenseDate).toLocaleDateString()}</Typography>
</Box>
<Stack direction="row" spacing={1} alignItems="center" mt={2}>
<TextField size="small" placeholder="Comment" id={`c-${exp.id}`} />
<Button variant="contained" onClick={() => decide(exp.id, true, document.getElementById(`c-${exp.id}`)?.value || '')}>Approve</Button>
<Button variant="outlined" color="error" onClick={() => decide(exp.id, false, document.getElementById(`c-${exp.id}`)?.value || '')}>Reject</Button>
</Stack>
</CardContent>
</Card>
))}
{!items.length && <Typography color="text.secondary">No pending approvals.</Typography>}
</Stack>
</Layout>
)
}