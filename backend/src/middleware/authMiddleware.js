const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  // 1. Get token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Attach user info to request object
    req.user = decoded; // Contains { userId, tenantId, role }
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token.' 
    });
  }
};

module.exports = authMiddleware;