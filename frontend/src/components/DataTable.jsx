import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'


export default function DataTable({ columns, rows, getKey }) {
return (
<TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eef0f4' }}>
<Table size="small">
<TableHead>
<TableRow>
{columns.map(c => <TableCell key={c.key}>{c.label}</TableCell>)}
</TableRow>
</TableHead>
<TableBody>
{rows.map(r => (
<TableRow key={getKey ? getKey(r) : r.id} hover>
{columns.map(c => (
<TableCell key={c.key}>{c.render ? c.render(r) : r[c.key]}</TableCell>
))}
</TableRow>
))}
</TableBody>
</Table>
</TableContainer>
)
}