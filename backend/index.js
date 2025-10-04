require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const auth = require('./routes/auth');
const admin = require('./routes/admin');
const employee = require('./routes/employee');
const manager = require('./routes/manager');

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: false }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', auth);
app.use('/api/admin', admin);
app.use('/api/employee', employee);
app.use('/api/manager', manager);

app.get('/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`api on :${port}`));
