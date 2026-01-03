const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (userId, tenantId, role) => {
  const payload = {
    userId,
    tenantId,
    role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

module.exports = generateToken;