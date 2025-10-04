const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  if (typeof password !== 'string' || !password.trim()) {
    throw new Error('Password must be a non-empty string');
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePassword(password, hashedPassword) {
  if (!hashedPassword) return false;
  return bcrypt.compare(password, hashedPassword);
}

module.exports = { hashPassword, comparePassword };
