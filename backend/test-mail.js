require('dotenv').config();
const { sendMail } = require('./lib/mailer');

(async () => {
  try {
    await sendMail(
      'baruahrohit344@gmail.com',
      'Test from Nodemailer',
      '<p>If you see this, Nodemailer is working ✅</p>'
    );
    console.log('Email sent');
  } catch (err) {
    console.error(err);
  }
})();
