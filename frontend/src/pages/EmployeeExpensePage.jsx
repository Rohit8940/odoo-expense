import { useEffect, useState } from "react";
import {
  Container, Typography, Box, Button, TextField, MenuItem, Table, TableHead, TableBody, TableCell, TableRow
} from "@mui/material";
import { api } from "../lib/api";
import { useAuth } from "../providers/AuthProvider";

const CATEGORIES = ["Food", "Travel", "Office Supplies", "Miscellaneous"];

export default function EmployeeExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [newExp, setNewExp] = useState({
    description: "", category: "", amount: "", currency: "INR", date: "", remarks: "", file: null,
  });

  const load = async () => {
    const { data } = await api.get("/api/employee/expenses", { params: { me: user.id } });
    setExpenses(data);
  };
  useEffect(() => { load(); }, []);

  const onChange = e => setNewExp(s => ({ ...s, [e.target.name]: e.target.value }));
  const onFile = e => setNewExp(s => ({ ...s, file: e.target.files[0] }));

  const createExpense = async () => {
    const form = new FormData();
    Object.entries(newExp).forEach(([k, v]) => form.append(k, v));
    form.append("userId", user.id);
    await api.post("/api/employee/expenses", form, { headers: { "Content-Type": "multipart/form-data" } });
    await load();
  };

  const submitExpense = async (id) => {
    await api.patch(`/api/employee/expenses/${id}/submit`);
    await load();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>My Expenses</Typography>

      {/* New Expense Form */}
      <Box display="grid" gridTemplateColumns="2fr 1fr 1fr" gap={1} alignItems="center">
        <TextField label="Description" name="description" value={newExp.description} onChange={onChange} />
        <TextField select name="category" label="Category" value={newExp.category} onChange={onChange}>
          {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField label="Amount" name="amount" value={newExp.amount} onChange={onChange} />
        <TextField label="Currency" name="currency" value={newExp.currency} onChange={onChange} />
        <TextField type="date" name="date" label="Date" value={newExp.date} onChange={onChange} InputLabelProps={{ shrink: true }} />
        <TextField label="Remarks" name="remarks" value={newExp.remarks} onChange={onChange} />
        <Button variant="outlined" component="label">Attach Receipt<input type="file" hidden onChange={onFile} /></Button>
      </Box>
      <Box mt={2}><Button variant="contained" onClick={createExpense}>Save Draft</Button></Box>

      {/* Expense Table */}
      <Box mt={4}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell><TableCell>Category</TableCell>
              <TableCell>Amount</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map(e => (
              <TableRow key={e.id}>
                <TableCell>{e.description}</TableCell>
                <TableCell>{e.category}</TableCell>
                <TableCell>{e.amount} {e.currency}</TableCell>
                <TableCell>{e.status}</TableCell>
                <TableCell>
                  {e.status === "DRAFT" && (
                    <Button onClick={() => submitExpense(e.id)}>Submit</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Container>
  );
}
