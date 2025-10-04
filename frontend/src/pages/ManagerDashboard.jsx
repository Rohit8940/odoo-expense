import { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Table, TableHead, TableBody, TableRow, TableCell, Button
} from '@mui/material';
import { api } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '');

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);

  const load = async () => {
    const { data } = await api.get('/api/manager/pending', { params: { me: user.id } });
    setRows(data);
  };
  useEffect(() => { load(); }, []);

  const decide = async (id, approve) => {
    await api.post(`/api/manager/expenses/${id}/decision`, { me: user.id, approve });
    await load();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Approvals to review</Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Approval Subject</TableCell>
            <TableCell>Request Owner</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Request Status</TableCell>
            <TableCell>Total amount (in company’s currency)</TableCell>
            <TableCell align="center" width={220}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(e => {
            const subject = e.description || '—';
            const owner = `${e.user?.firstName || ''} ${e.user?.lastName || ''}`.trim();
            const fxNote = `${fmt(e.amount)} ${e.currency} (→ ${e.baseCurrency}) = ${fmt(e.convertedAmount)} ${e.baseCurrency}`;
            const showActions = e.status === 'WAITING_APPROVAL';
            return (
              <TableRow key={e.id} hover>
                <TableCell>{subject}</TableCell>
                <TableCell>{owner || '—'}</TableCell>
                <TableCell>{e.category || '—'}</TableCell>
                <TableCell>{e.status}</TableCell>
                <TableCell>{fxNote}</TableCell>
                <TableCell align="center">
                  {showActions ? (
                    <Box display="inline-flex" gap={1}>
                      <Button size="small" variant="outlined" color="success" onClick={() => decide(e.id, true)}>Approve</Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => decide(e.id, false)}>Reject</Button>
                    </Box>
                  ) : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Container>
  );
}
