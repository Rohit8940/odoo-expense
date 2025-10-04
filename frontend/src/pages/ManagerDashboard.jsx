import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Button
} from '@mui/material';
import { api } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

const fmtNumber = (value, fraction = 2) => (
  Number.isFinite(value)
    ? value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: fraction })
    : null
);

const statusLabel = (status) => {
  switch (status) {
    case 'SUBMITTED':
    case 'WAITING_APPROVAL':
      return 'Submitted';
    case 'IN_REVIEW':
      return 'In review';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status || 'Unknown';
  }
};

const canActOn = (status) => (
  status === 'SUBMITTED'
  || status === 'WAITING_APPROVAL'
  || status === 'IN_REVIEW'
);

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/api/manager/pending', { params: { me: user.id } });
      setRows(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load approvals right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]); // wait for user.id

  const decide = async (id, approve) => {
    try {
      setLoading(true);
      const { data } = await api.post(`/api/manager/expenses/${id}/decision`, { me: user.id, approve });
      setRows((prev) => prev.map((row) => (row.id === id ? data : row)));
    } catch (err) {
      console.error(err);
      setError('Decision failed, please retry.');
    } finally {
      setLoading(false);
    }
  };

  const conversionText = (row) => {
    const baseAmount = fmtNumber(row.amount);
    const original = baseAmount && row.currency
      ? `${baseAmount} ${row.currency}`
      : baseAmount || 'N/A';

    if (Number.isFinite(row.convertedAmount) && row.baseCurrency) {
      const converted = `${fmtNumber(row.convertedAmount)} ${row.baseCurrency}`;
      const rateNote = Number.isFinite(row.fxRate) ? ` (rate ${fmtNumber(row.fxRate, 4)})` : '';
      return `${original}${rateNote} = ${converted}`;
    }

    return original;
  };

  const ownerText = (row) => row.employee || 'N/A';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      {/* Header with logout */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Approvals to review</Typography>
        <Button
          variant="outlined"
          color="secondary"
          onClick={logout}
        >
          Logout
        </Button>
      </Box>

      {error && (
        <Paper sx={{ mb: 2, p: 2, bgcolor: 'error.light' }}>
          <Typography color="error.contrastText">{error}</Typography>
        </Paper>
      )}

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Approval subject</TableCell>
              <TableCell>Request owner</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Total amount (company currency)</TableCell>
              <TableCell align="center" width={210}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const actionsVisible = canActOn(row.status);
              return (
                <TableRow key={row.id} hover>
                  <TableCell>{row.description || 'N/A'}</TableCell>
                  <TableCell>{ownerText(row)}</TableCell>
                  <TableCell>{row.category || 'N/A'}</TableCell>
                  <TableCell>{statusLabel(row.status)}</TableCell>
                  <TableCell>{conversionText(row)}</TableCell>
                  <TableCell align="center">
                    {actionsVisible ? (
                      <Box display="inline-flex" gap={1}>
                        <Button
                          size="small"
                          color="success"
                          variant="outlined"
                          disabled={loading}
                          onClick={() => decide(row.id, true)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={loading}
                          onClick={() => decide(row.id, false)}
                        >
                          Reject
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Decision recorded
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  {loading ? 'Loading approvals…' : 'No items waiting for your approval.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
