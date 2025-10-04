import { Grid, Typography } from '@mui/material'
import Layout from '../layout/Layout'
import StatCard from '../components/StatCard'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'


export default function Dashboard() {
const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })


useEffect(() => {
// Minimal demo: derive from /expenses/me
;(async () => {
try {
const mine = await api('/expenses/me')
const total = mine.length
const pending = mine.filter(e => ['SUBMITTED','IN_REVIEW','DRAFT'].includes(e.status)).length
const approved = mine.filter(e => e.status === 'APPROVED').length
const rejected = mine.filter(e => e.status === 'REJECTED').length
setStats({ total, pending, approved, rejected })
} catch {}
})()
}, [])


return (
<Layout>
<Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Dashboard</Typography>
<Grid container spacing={2}>
<Grid item xs={12} sm={6} md={3}><StatCard label="My expenses" value={stats.total} /></Grid>
<Grid item xs={12} sm={6} md={3}><StatCard label="Pending" value={stats.pending} /></Grid>
<Grid item xs={12} sm={6} md={3}><StatCard label="Approved" value={stats.approved} /></Grid>
<Grid item xs={12} sm={6} md={3}><StatCard label="Rejected" value={stats.rejected} /></Grid>
</Grid>
</Layout>
)
}