import { useEffect, useState } from 'react'
import { Box, Button, FormControlLabel, Paper, Stack, Switch, TextField, Typography } from '@mui/material'
import Layout from '../../layout/Layout'
import { api } from '../../lib/api'


export default function Rules() {
const [rule, setRule] = useState({ isActive:false, ruleType:'HYBRID', percentageNeeded:60, specificUserId:'', orLogic:true })


useEffect(() => { (async () => {
try {
const r = await api('/admin/rules/current')
if (r) setRule({ isActive:r.isActive, ruleType:r.ruleType, percentageNeeded:r.percentageNeeded||60, specificUserId:r.specificUserId||'', orLogic:!!r.orLogic })
} catch {}
})() }, [])


async function save() {
const payload = { ...rule, specificUserId: rule.specificUserId ? Number(rule.specificUserId) : null }
await api('/admin/rules/current', { method: 'PUT', body: JSON.stringify(payload) })
}


return (
<Layout>
<Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Approval Rules</Typography>
<Paper elevation={0} sx={{ p: 2, border: '1px solid #eef0f4', maxWidth: 640 }}>
<Stack spacing={2}>
<FormControlLabel control={<Switch checked={!!rule.isActive} onChange={e=>setRule({...rule, isActive:e.target.checked})}/>} label="Enable rule" />
<TextField label="Rule type" value={rule.ruleType} disabled />
<TextField label="Percentage needed" type="number" value={rule.percentageNeeded} onChange={e=>setRule({...rule, percentageNeeded:Number(e.target.value)})} />
<TextField label="Specific approver userId" value={rule.specificUserId} onChange={e=>setRule({...rule, specificUserId:e.target.value})} />
<FormControlLabel control={<Switch checked={!!rule.orLogic} onChange={e=>setRule({...rule, orLogic:e.target.checked})}/>} label="Use OR logic (else AND)" />
<Button variant="contained" onClick={save}>Save</Button>
</Stack>
</Paper>
</Layout>
)
}