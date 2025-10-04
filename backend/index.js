const express = require('express');
const cookieParser = require('cookie-parser');

const authRouter = require('./src/routes/auth');
const expenseRouter = require('./src/routes/expense.route');
const approvalsRouter = require('./src/routes/approvals.route');
const usersRouter = require('./src/routes/users.route');
const ocrRouter = require('./src/routes/ocr.route');
const { attachUser } = require('./src/middleware/auth');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

app.use('/api/auth', authRouter);
app.use('/api/expenses', expenseRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/users', usersRouter);
app.use('/api/ocr', ocrRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('api listening on ' + PORT));
