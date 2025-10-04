import { useEffect, useMemo, useState } from 'react';
import { Container, Typography, Box, TextField, MenuItem, Button, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { api } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

const ROLES = ['ADMIN','MANAGER','EMPLOYEE'];

export default function AdminUsers() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [all, setAll] = useState([]);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', role: 'EMPLOYEE', managerId: '' });

  const load = async () => {
    const [usersRes] = await Promise.all([
      api.get('/api/admin/users', { params: { me: user.id } })
    ]);
    setRows(usersRes.data);
    setAll(usersRes.data);
  };

  useEffect(() => { load(); }, []);

  const managers = useMemo(() => all.filter(u => u.role !== 'EMPLOYEE'), [all]);

  const saveNew = async () => {
    const { data } = await api.post('/api/admin/users', { me: user.id, ...newUser });
    setNewUser({ firstName: '', lastName: '', email: '', role: 'EMPLOYEE', managerId: '' });
    await load();
    alert("User created. Temporary password sent via email.");
  };

  const updateRow = (id, patch) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));

  const persist = async (r) => {
    await api.patch(`/api/admin/users/${r.id}`, { role: r.role, managerId: r.managerId || null });
    await load();
  };

 const resetPassword = async (id) => {
  await api.post(`/api/admin/users/${id}/send-password`);
  alert("Temporary password sent to user's email.");
};


  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="h5">Users</Typography>
        <IconButton onClick={load}><RefreshIcon /></IconButton>
      </Box>

      {/* New row */}
      <Box display="grid" gridTemplateColumns="1fr 1fr 2fr 1fr 1fr" gap={1} mt={2}>
        <TextField label="First name" value={newUser.firstName} onChange={e=>setNewUser(s=>({...s, firstName:e.target.value}))}/>
        <TextField label="Last name" value={newUser.lastName} onChange={e=>setNewUser(s=>({...s, lastName:e.target.value}))}/>
        <TextField label="Email" value={newUser.email} onChange={e=>setNewUser(s=>({...s, email:e.target.value}))}/>
        <TextField select label="Role" value={newUser.role} onChange={e=>setNewUser(s=>({...s, role:e.target.value}))}>
          {ROLES.map(r=> <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        <TextField select label="Manager" value={newUser.managerId} onChange={e=>setNewUser(s=>({...s, managerId:e.target.value}))}>
          <MenuItem value="">None</MenuItem>
          {managers.map(m=> <MenuItem key={m.id} value={m.id}>{m.firstName} {m.lastName || ''}</MenuItem>)}
        </TextField>
      </Box>
      <Box mt={1}><Button variant="contained" onClick={saveNew}>Create</Button></Box>

      {/* Existing */}
      <Box mt={4}>
        {rows.map(r=>(
          <Box key={r.id} display="grid" gridTemplateColumns="1fr 2fr 1fr 1fr 1fr" gap={1} alignItems="center" sx={{ mb:1 }}>
            <Typography>{r.firstName} {r.lastName}</Typography>
            <Typography>{r.email}</Typography>
            <TextField select value={r.role} onChange={e=>updateRow(r.id,{ role:e.target.value })}>
              {ROLES.map(x=> <MenuItem key={x} value={x}>{x}</MenuItem>)}
            </TextField>
            <TextField select value={r.managerId || ''} onChange={e=>updateRow(r.id,{ managerId:e.target.value })}>
              <MenuItem value="">None</MenuItem>
              {managers.map(m=> <MenuItem key={m.id} value={m.id}>{m.firstName} {m.lastName || ''}</MenuItem>)}
            </TextField>
            <Box display="flex" gap={1}>
              <Button size="small" variant="outlined" onClick={()=>persist(r)}>Save</Button>
              <Button size="small" onClick={()=>resetPassword(r.id)}>Send password</Button>
            </Box>
          </Box>
        ))}
      </Box>
    </Container>
  );
}
