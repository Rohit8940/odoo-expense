const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/parse-receipt', requireAuth, async (req, res) => {
  // plug your uploader + OCR here; for the demo we fake it
  res.json({
    amount: 123.45,
    currency: 'USD',
    description: 'Lunch at Example Bistro',
    expenseDate: new Date().toISOString().slice(0, 10),
    category: 'Meals',
    merchant: 'Example Bistro'
  });
});

module.exports = router;
