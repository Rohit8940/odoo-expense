import { useState } from 'react';
import { Container, TextField, Button, Box, Typography } from '@mui/material';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onChange = e => setForm(s => ({ ...s, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return alert('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Password updated');
      nav('/'); // or role-based landing
    } catch (err) {
      alert('Change failed');
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 6 }}>
      <Typography variant="h5" gutterBottom>Change password</Typography>
      <Box component="form" onSubmit={submit}>
        <TextField name="currentPassword" type="password" label="Current temporary password" fullWidth margin="normal" value={form.currentPassword} onChange={onChange} required />
        <TextField name="newPassword" type="password" label="New password" fullWidth margin="normal" value={form.newPassword} onChange={onChange} required />
        <TextField name="confirm" type="password" label="Confirm new password" fullWidth margin="normal" value={form.confirm} onChange={onChange} required />
        <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ mt: 2 }}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </Box>
    </Container>
  );
}
