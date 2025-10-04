import { useEffect, useState } from 'react'
import { Box, Button, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import Layout from '../../layout/Layout'
import { api } from '../../lib/api'


export default function Users() {
const [form, setForm] = useState({ email:'', fullName:'', roleName:'EMPLOYEE', password:'TEMP', managerUserId:'' })
const [users, setUsers] = useState([])


async function load() {
try { const list = await api('/admin/users'); setUsers(list) } catch {}
}
useEffect(() => { load() }, [])


async function createUser() {
const payload = { ...form, managerUserId: form.managerUserId ? Number(form.managerUserId) : null }
await api('/users', { method: 'POST', body: JSON.stringify(payload) })
setForm({ email:'', fullName:'', roleName:'EMPLOYEE', password:'TEMP', managerUserId:'' })
load()
}


return (
<Layout>
<Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Users</Typography>
<Paper elevation={0} sx={{ p: 2, border: '1px solid #eef0f4', mb: 3 }}>
<Grid container spacing={2}>
<Grid item xs={12} md={4}><TextField fullWidth label="Full name" value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})}/></Grid>
<Grid item xs={12} md={4}><TextField fullWidth label="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/></Grid>
<Grid item xs={12} md={2}>
<TextField select fullWidth label="Role" value={form.roleName} onChange={e=>setForm({...form, roleName:e.target.value})}>
<MenuItem value="ADMIN">ADMIN</MenuItem>
<MenuItem value="MANAGER">MANAGER</MenuItem>
<MenuItem value="EMPLOYEE">EMPLOYEE</MenuItem>
</TextField>
</Grid>
<Grid item xs={12} md={2}><TextField fullWidth label="Manager User ID (optional)" value={form.managerUserId} onChange={e=>setForm({...form, managerUserId:e.target.value})}/></Grid>
</Grid>
<Stack direction="row" justifyContent="flex-end" mt={2}><Button variant="contained" onClick={createUser}>Create</Button></Stack>
</Paper>


{users?.length > 0 && (
<>
<Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>All users</Typography>
<pre style={{ background:'#f5f5f5', padding:12, borderRadius:8, overflow:'auto' }}>{JSON.stringify(users, null, 2)}</pre>
</>
)}
</Layout>
)
}