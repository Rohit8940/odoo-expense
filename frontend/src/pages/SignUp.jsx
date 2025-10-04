import { useEffect, useState } from 'react';
import { Container, TextField, Button, MenuItem, Box, Typography } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function SignUp() {
  const [countries, setCountries] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', country: '', currency: '' });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,currencies')
      .then(r => r.json())
      .then(list => {
        const options = list
          .map(c => {
            const code = c.currencies ? Object.keys(c.currencies)[0] : null;
            return code ? { label: c.name.common, value: c.name.common, currency: code } : null;
          })
          .filter(Boolean)
          .sort((a, b) => a.label.localeCompare(b.label));
        setCountries(options);
      });
  }, []);

  const onChange = e => setForm(s => ({ ...s, [e.target.name]: e.target.value }));

  const onCountry = e => {
    const country = e.target.value;
    const pick = countries.find(c => c.value === country);
    setForm(s => ({ ...s, country, currency: pick?.currency || '' }));
  };

  const submit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) return alert('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/api/auth/signup', {
        name: form.name,
        email: form.email,
        password: form.password,
        companyCountry: form.country,
        companyCurrency: form.currency
      });
      nav('/login');
    } catch (err) {
      console.error(err);
      alert('Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 6 }}>
      <Typography variant="h5" gutterBottom>Admin Signup</Typography>
      <Box component="form" onSubmit={submit} noValidate>
        <TextField name="name" label="Name" fullWidth margin="normal" value={form.name} onChange={onChange} required />
        <TextField name="email" type="email" label="Email" fullWidth margin="normal" value={form.email} onChange={onChange} required />
        <TextField name="password" type="password" label="Password" fullWidth margin="normal" value={form.password} onChange={onChange} required />
        <TextField name="confirm" type="password" label="Confirm password" fullWidth margin="normal" value={form.confirm} onChange={onChange} required />
        <TextField select label="Country selection" value={form.country} onChange={onCountry} fullWidth margin="normal" required>
          {countries.map(c => <MenuItem key={c.value} value={c.value}>{c.label} — {c.currency}</MenuItem>)}
        </TextField>
        <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 2 }}>
          {loading ? 'Signing up…' : 'Signup'}
        </Button>
      </Box>
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Typography variant="body2">Already have an account?</Typography>
        <Link to="/login">Login</Link>
      </Box>
    </Container>
  );
}
