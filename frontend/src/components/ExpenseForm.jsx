import { useState } from 'react'
import { Box, Button, Grid, Paper, Stack, TextField, Typography } from '@mui/material'
import { api } from '../lib/api'


export default function ExpenseForm({ onSaved }) {
const [form, setForm] = useState({ amount:'', currency:'INR', category:'', description:'', expenseDate:'' })
const [msg, setMsg] = useState('')


async function scan() {
const parsed = await api('/ocr/parse-receipt', { method: 'POST' })
setForm(f => ({
...f,
amount: parsed.amount?.toString() || f.amount,
currency: parsed.currency || f.currency,
category: parsed.category || f.category,
description: parsed.description || f.description,
expenseDate: parsed.expenseDate || f.expenseDate
}))
}


async function submit(submitFlag) {
setMsg('')
const payload = {
amount: Number(form.amount),
currency: form.currency,
category: form.category,
description: form.description,
expenseDate: form.expenseDate,
submit: submitFlag
}
await api('/expenses', { method: 'POST', body: JSON.stringify(payload) })
setMsg(submitFlag ? 'Submitted for approval' : 'Saved as draft')
onSaved && onSaved()
}


return (
<Paper elevation={0} sx={{ p: 2, border: '1px solid #eef0f4' }}>
<Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Create expense</Typography>
<Grid container spacing={2}>
<Grid item xs={12} md={4}><TextField fullWidth label="Amount" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} /></Grid>
<Grid item xs={12} md={4}><TextField fullWidth label="Currency" value={form.currency} onChange={e=>setForm({...form, currency:e.target.value})} placeholder="INR, USD" /></Grid>
<Grid item xs={12} md={4}><TextField fullWidth label="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} /></Grid>
<Grid item xs={12}><TextField fullWidth label="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} /></Grid>
<Grid item xs={12} md={6}><TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.expenseDate} onChange={e=>setForm({...form, expenseDate:e.target.value})} /></Grid>
</Grid>
<Stack direction="row" spacing={2} sx={{ mt: 2 }}>
<Button variant="outlined" onClick={scan}>Scan receipt</Button>
<Button variant="contained" onClick={() => submit(false)}>Save draft</Button>
<Button variant="contained" onClick={() => submit(true)}>Submit</Button>
</Stack>
{msg && <Box sx={{ mt: 1 }}><Typography color="success.main">{msg}</Typography></Box>}
</Paper>
)
}