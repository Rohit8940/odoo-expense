require('dotenv').config();
const express = require('express');
const cors = require('cors');
const auth = require('./routes/auth');
const admin = require('./routes/admin');
const { sendMail } = require('./lib/mailer');



const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', auth);
app.use('/api/admin', admin);
// backend/index.js
app.use(cors({ origin: 'http://localhost:5173', credentials: false }));

app.get('/health', (_, res) => res.json({ ok: true }));
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`api on :${port}`));
