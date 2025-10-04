import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

const initialForm = (defaults = {}) => ({
  description: '',
  categoryId: '',
  currency: defaults.currency || 'INR',
  amount: '',
  expenseDate: new Date().toISOString().slice(0, 10),
  receipt: null
});

const fmtCurrency = (value, currency) => {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value);
};

export default function EmployeeExpensePage() {
  const { user, logout } = useAuth(); // added logout
  const [loading, setLoading] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState('INR');
  const [totals, setTotals] = useState({ toSubmit: 0, waiting: 0, approved: 0 });
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(initialForm());
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/employee/expenses', { params: { me: user.id } });
      setBaseCurrency(data.baseCurrency);
      setTotals(data.totals);
      setCategories(data.categories || []);
      setExpenses(data.expenses || []);
      if (data.expenses?.length) {
        setSelectedId((prev) => (prev && data.expenses.some((exp) => exp.id === prev)) ? prev : data.expenses[0].id);
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onReceipt = (event) => {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, receipt: file }));
    if (event.target) event.target.value = '';
  };

  const resetForm = () => {
    setForm(initialForm({ currency: form.currency }));
  };

  const createExpense = async () => {
    const payload = new FormData();
    payload.append('employeeId', user.id);
    payload.append('description', form.description);
    payload.append('categoryId', form.categoryId);
    payload.append('currency', form.currency);
    payload.append('amount', form.amount);
    payload.append('expenseDate', form.expenseDate);
    if (form.receipt) payload.append('receipt', form.receipt);

    try {
      setLoading(true);
      await api.post('/api/employee/expenses', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      setError('Could not save expense draft.');
    } finally {
      setLoading(false);
    }
  };

  const submitExpense = async (expenseId) => {
    try {
      setLoading(true);
      await api.patch(`/api/employee/expenses/${expenseId}/submit`, {
        employeeId: user.id
      });
      await load();
    } catch (err) {
      console.error(err);
      setError('Unable to submit expense.');
    } finally {
      setLoading(false);
    }
  };

  const selectedExpense = useMemo(
    () => expenses.find((exp) => exp.id === selectedId) || null,
    [expenses, selectedId]
  );

  const handleRowClick = (id) => setSelectedId(id);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      {/* Header with logout */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">My Expenses</Typography>
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

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>To submit</Typography>
              <Typography variant="h5">{fmtCurrency(totals.toSubmit, baseCurrency)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Waiting approval</Typography>
              <Typography variant="h5">{fmtCurrency(totals.waiting, baseCurrency)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Approved</Typography>
              <Typography variant="h5">{fmtCurrency(totals.approved, baseCurrency)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">New expense</Typography>
          <ButtonGroup variant="outlined">
            <Button component="label" startIcon={<UploadFileIcon />}>
              Upload receipt
              <input type="file" hidden onChange={onReceipt} />
            </Button>
            <Button startIcon={<AddIcon />} onClick={resetForm}>New</Button>
          </ButtonGroup>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Description"
              name="description"
              value={form.description}
              onChange={onField}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Category"
              name="categoryId"
              value={form.categoryId}
              onChange={onField}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Amount"
              name="amount"
              type="number"
              value={form.amount}
              onChange={onField}
              fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start">{form.currency}</InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Currency"
              name="currency"
              value={form.currency}
              onChange={onField}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Expense date"
              name="expenseDate"
              type="date"
              value={form.expenseDate}
              onChange={onField}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4} display="flex" alignItems="center">
            {form.receipt ? (
              <Typography variant="body2">Attached: {form.receipt.name}</Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">No receipt attached</Typography>
            )}
          </Grid>
        </Grid>
        <Box mt={2}>
          <Button
            variant="contained"
            onClick={createExpense}
            disabled={loading}
          >
            Save draft
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Expense date</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((exp) => (
                  <TableRow
                    key={exp.id}
                    hover
                    selected={exp.id === selectedId}
                    onClick={() => handleRowClick(exp.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{exp.description || 'N/A'}</TableCell>
                    <TableCell>{exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{exp.category?.name || 'N/A'}</TableCell>
                    <TableCell align="right">{fmtCurrency(exp.convertedAmount, baseCurrency)}</TableCell>
                    <TableCell>{exp.status}</TableCell>
                  </TableRow>
                ))}
                {!expenses.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No expenses yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 2, minHeight: 320 }}>
            {selectedExpense ? (
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Expense details</Typography>
                  {selectedExpense.receipt?.fileUrl && (
                    <IconButton
                      component="a"
                      href={`/${selectedExpense.receipt.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <UploadFileIcon />
                    </IconButton>
                  )}
                </Box>
                <Divider />
                <Typography variant="body2" color="text.secondary">Description</Typography>
                <Typography>{selectedExpense.description || 'N/A'}</Typography>

                <Box display="flex" gap={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Amount</Typography>
                    <Typography>{fmtCurrency(selectedExpense.amount, selectedExpense.currency)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Converted</Typography>
                    <Typography>{fmtCurrency(selectedExpense.convertedAmount, baseCurrency)}</Typography>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Typography>{selectedExpense.status}</Typography>

                <Typography variant="body2" color="text.secondary">Approvals</Typography>
                <List dense>
                  {selectedExpense.approvals?.length ? (
                    selectedExpense.approvals.map((item) => (
                      <ListItem key={item.id} disablePadding>
                        <ListItemText
                          primary={item.approver || 'Pending approver'}
                          secondary={item.decision === 'PENDING'
                            ? 'Waiting'
                            : `${item.decision || 'N/A'} - ${item.decidedAt ? new Date(item.decidedAt).toLocaleString() : ''}`}
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem disablePadding>
                      <ListItemText primary="No approval history yet" />
                    </ListItem>
                  )}
                </List>

                {selectedExpense.status === 'DRAFT' && (
                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Button
                      variant="contained"
                      onClick={() => submitExpense(selectedExpense.id)}
                      disabled={loading}
                    >
                      Submit for approval
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                <Typography color="text.secondary">Select an expense to view details.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
