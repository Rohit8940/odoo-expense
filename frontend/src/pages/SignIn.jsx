import { useState } from 'react';
import { Container, TextField, Button, Box, Typography } from '@mui/material';
import { useAuth } from '../providers/AuthProvider.jsx';
import { Link, useNavigate } from 'react-router-dom';

const landingRoute = (role) => {
  switch (role) {
    case 'ADMIN':
      return '/admin/users';
    case 'MANAGER':
      return '/admin/approval';
    case 'EMPLOYEE':
    default:
      return '/admin/approval';
  }
};

export default function SignIn() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

const submit = async (event) => {
  event.preventDefault();
  setLoading(true);
  try {
    const loggedIn = await login(form.email, form.password);
    if (loggedIn.mustChangePassword) {
      nav('/change-password', { replace: true });
    } else {
      const destination = landingRoute(loggedIn?.role);
      nav(destination, { replace: true });
    }
  } catch (err) {
    console.error(err);
    alert('Login failed');
  } finally {
    setLoading(false);
  }
};

  return (
    <Container maxWidth="xs" sx={{ mt: 6 }}>
      <Typography variant="h5" gutterBottom>Sign in</Typography>
      <Box component="form" onSubmit={submit} noValidate>
        <TextField name="email" type="email" label="Email" fullWidth margin="normal" value={form.email} onChange={onChange} required />
        <TextField name="password" type="password" label="Password" fullWidth margin="normal" value={form.password} onChange={onChange} required />
        <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 2 }}>Login</Button>
      </Box>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Link to="/signup">Don't have an account? Signup</Link>
        <Link to="/forgot">Forgot password?</Link>
      </Box>
    </Container>
  );
}
