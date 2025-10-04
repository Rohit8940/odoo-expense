import { useEffect, useMemo, useState } from 'react';
import { Container, Typography, Box, TextField, MenuItem, Checkbox, FormControlLabel, Button } from '@mui/material';
import { api } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

export default function AdminApprovalRules() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [flowName, setFlowName] = useState('Miscellaneous');
  const [useMgrFirst, setUseMgrFirst] = useState(true);
  const [isSequential, setIsSequential] = useState(true);
  const [rows, setRows] = useState([{ userId: '', required: true }]);
  const [percent, setPercent] = useState(60);
  const [specificApproverId, setSpecificApproverId] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await api.get('/api/admin/candidates', { params: { me: user.id } });
      setCandidates(data);
      const { data: conf } = await api.get('/api/admin/flow', { params: { me: user.id, name: flowName } });
      if (conf.flow) {
        setUseMgrFirst(conf.flow.useManagerAsFirstApprover);
        setIsSequential(conf.flow.isSequential);
        setRows(conf.flow.steps.sort((a,b)=>a.order-b.order).map(s => ({ userId: s.approverUserId || '', required: s.isRequired })));
      }
      if (conf.policy) {
        setPercent(conf.policy.requiredPercent ?? 60);
        setSpecificApproverId(conf.policy.specificApproverId || '');
      }
    }
    load();
  }, [flowName, user.id]);

  const addRow = () => setRows(r => [...r, { userId: '', required: true }]);
  const updateRow = (i, patch) => setRows(r => r.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));

  const save = async () => {
    const body = {
      me: user.id,
      name: flowName,
      useManagerAsFirstApprover: useMgrFirst,
      isSequential,
      approvers: rows.filter(r => r.userId),
      requiredPercent: percent || null,
      specificApproverId: specificApproverId || null
    };
    await api.post('/api/admin/flow', body);
    alert('Saved');
  };

  const peopleById = useMemo(() => Object.fromEntries(candidates.map(u => [u.id, `${u.firstName} ${u.lastName || ''}`])), [candidates]);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Approval rules</Typography>

      <Box display="grid" gridTemplateColumns="2fr 1fr" gap={2}>
        <TextField label="Rule name" value={flowName} onChange={e=>setFlowName(e.target.value)} />
        <TextField select label="Specific approver (e.g., CFO)" value={specificApproverId} onChange={e=>setSpecificApproverId(e.target.value)}>
          <MenuItem value="">None</MenuItem>
          {candidates.map(u => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
        </TextField>
      </Box>

      <Box mt={2}>
        <FormControlLabel control={<Checkbox checked={useMgrFirst} onChange={e=>setUseMgrFirst(e.target.checked)} />} label="Is manager an approver?" />
        <FormControlLabel control={<Checkbox checked={isSequential} onChange={e=>setIsSequential(e.target.checked)} />} label="Approver sequence matters" />
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>Approvers</Typography>
        {rows.map((r, i) => (
          <Box key={i} display="grid" gridTemplateColumns="3fr 1fr 0.8fr" gap={1} alignItems="center" sx={{ mb:1 }}>
            <TextField select label={`User ${i+1}`} value={r.userId} onChange={e=>updateRow(i,{ userId:e.target.value })}>
              <MenuItem value="">Select user</MenuItem>
              {candidates.map(u => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
            </TextField>
            <FormControlLabel control={<Checkbox checked={r.required} onChange={e=>updateRow(i,{ required:e.target.checked })}/>} label="Required" />
            <Button onClick={()=>removeRow(i)}>Remove</Button>
          </Box>
        ))}
        <Button variant="outlined" onClick={addRow}>Add approver</Button>
      </Box>

      <Box mt={3} display="grid" gridTemplateColumns="1fr 2fr" gap={2} alignItems="center">
        <TextField type="number" label="Minimum approval percentage" value={percent} onChange={e=>setPercent(Number(e.target.value))} inputProps={{ min:0, max:100 }} />
        <Typography variant="body2">Specify required % of approvals OR the specific approver above to auto-approve. Current: {percent}% {specificApproverId ? `or ${peopleById[specificApproverId]}`:''}</Typography>
      </Box>

      <Box mt={3}><Button variant="contained" onClick={save}>Save rules</Button></Box>
    </Container>
  );
}
