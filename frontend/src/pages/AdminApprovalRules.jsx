import { useEffect, useMemo, useState } from 'react';
import {
  Container, Typography, Box, TextField, MenuItem, Checkbox,
  FormControlLabel, Button, IconButton, Tooltip
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

export default function AdminApprovalRules() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const [people, setPeople] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [flowName, setFlowName] = useState('Miscellaneous');
  const [description, setDescription] = useState('Approval rule for miscellaneous expenses');
  const [useMgrFirst, setUseMgrFirst] = useState(true);
  const [isSequential, setIsSequential] = useState(true);
  const [rows, setRows] = useState([{ userId: '', required: true }]);
  const [percent, setPercent] = useState(60);
  const [specificApproverId, setSpecificApproverId] = useState('');

  const employees = useMemo(() => people, [people]);
  const managers = useMemo(() => people.filter(p => p.role !== 'EMPLOYEE'), [people]);

  useEffect(() => {
    (async () => {
      const { data: candidates } = await api.get('/api/admin/candidates', { params: { me: user.id } });
      setPeople(candidates);
      const defaultUserId = candidates.find(x => x.role === 'EMPLOYEE')?.id || candidates[0]?.id || '';
      setSelectedUserId(prev => prev || defaultUserId);

      const { data: conf } = await api.get('/api/admin/flow', { params: { me: user.id, name: flowName } });
      if (conf.flow) {
        setDescription(conf.flow.description || 'Approval rule for miscellaneous expenses');
        setUseMgrFirst(conf.flow.useManagerAsFirstApprover);
        setIsSequential(conf.flow.isSequential);
        setRows(conf.flow.steps.sort((a,b)=>a.order-b.order).map(s => ({ userId: s.approverUserId || '', required: s.isRequired })));
      }
      if (conf.policy) {
        setPercent(conf.policy.requiredPercent ?? 60);
        setSpecificApproverId(conf.policy.specificApproverId || '');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowName, user.id]);

  const selectedUser = useMemo(() => people.find(p => p.id === selectedUserId), [people, selectedUserId]);

  const addRow = () => setRows(r => [...r, { userId: '', required: true }]);
  const updateRow = (i, patch) => setRows(r => r.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));

  async function updateManager(managerId) {
    if (!selectedUser) return;
    await api.patch(`/api/admin/users/${selectedUser.id}`, { managerId: managerId || null });
  }

  function validate() {
    if (percent < 0 || percent > 100) return 'Minimum approval % must be between 0 and 100';
    const ids = rows.filter(r => r.userId).map(r => r.userId);
    const dup = ids.find((id, i) => ids.indexOf(id) !== i);
    if (dup) return 'Duplicate approver selected';
    if (useMgrFirst && !selectedUser?.managerId) return 'User has no manager set';
    return null;
    }

  const save = async () => {
    const msg = validate();
    if (msg) return alert(msg);

    const body = {
      me: user.id,
      name: flowName,
      description,
      useManagerAsFirstApprover: useMgrFirst,
      isSequential,
      approvers: rows.filter(r => r.userId),
      requiredPercent: percent || null,
      specificApproverId: specificApproverId || null
    };
    await api.post('/api/admin/flow', body);
    alert('Saved');
  };

  const doLogout = () => { logout(); nav('/login'); };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Approval rules</Typography>
        <Tooltip title="Logout">
          <IconButton color="error" onClick={doLogout}><LogoutIcon /></IconButton>
        </Tooltip>
      </Box>

      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
        <TextField select label="User" value={selectedUserId} onChange={e=>setSelectedUserId(e.target.value)}>
          {employees.map(u => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
        </TextField>
        <TextField label="Rule name" value={flowName} onChange={e=>setFlowName(e.target.value)} />
      </Box>

      <Box mt={2}>
        <TextField label="Description about rules" value={description} onChange={e=>setDescription(e.target.value)} fullWidth />
      </Box>

      <Box mt={2} display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
        <TextField
          select
          label="Manager"
          value={selectedUser?.managerId || ''}
          onChange={async e => {
            const v = e.target.value;
            await updateManager(v);
            setPeople(ps => ps.map(p => p.id === selectedUserId ? { ...p, managerId: v } : p));
          }}
        >
          <MenuItem value="">None</MenuItem>
          {managers.map(m => <MenuItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</MenuItem>)}
        </TextField>

        <Box>
          <FormControlLabel control={<Checkbox checked={useMgrFirst} onChange={e=>setUseMgrFirst(e.target.checked)} />} label="Is manager an approver?" />
          <FormControlLabel sx={{ ml: 2 }} control={<Checkbox checked={isSequential} onChange={e=>setIsSequential(e.target.checked)} />} label="Approvers sequence matters" />
        </Box>
      </Box>

      <Box mt={3}>
        <Typography variant="subtitle1" gutterBottom>Approvers</Typography>
        {rows.map((r, i) => (
          <Box key={i} display="grid" gridTemplateColumns="3fr 1fr 0.8fr" gap={1} alignItems="center" sx={{ mb:1 }}>
            <TextField select label={`User ${i+1}`} value={r.userId} onChange={e=>updateRow(i,{ userId:e.target.value })}>
              <MenuItem value="">Select user</MenuItem>
              {people.map(u => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
            </TextField>
            <FormControlLabel control={<Checkbox checked={r.required} onChange={e=>updateRow(i,{ required:e.target.checked })}/>} label="Required" />
            <Button onClick={()=>removeRow(i)}>Remove</Button>
          </Box>
        ))}
        <Button variant="outlined" onClick={addRow}>Add approver</Button>
      </Box>

      <Box mt={3} display="grid" gridTemplateColumns="1fr 2fr" gap={2} alignItems="center">
        <TextField type="number" label="Minimum approval percentage" value={percent} onChange={e=>setPercent(Number(e.target.value))} inputProps={{ min:0, max:100 }} />
        <TextField select label="Specific approver (e.g., CFO)" value={specificApproverId} onChange={e=>setSpecificApproverId(e.target.value)}>
          <MenuItem value="">None</MenuItem>
          {people.map(u => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
        </TextField>
      </Box>

      <Box mt={3}><Button variant="contained" onClick={save}>Save rules</Button></Box>
    </Container>
  );
}
