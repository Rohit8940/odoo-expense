import { Card, CardContent, Typography } from '@mui/material'


export default function StatCard({ label, value, hint }) {
return (
<Card elevation={0} sx={{ border: '1px solid #eef0f4' }}>
<CardContent>
<Typography variant="overline" color="text.secondary">{label}</Typography>
<Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>{value}</Typography>
{hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
</CardContent>
</Card>
)
}