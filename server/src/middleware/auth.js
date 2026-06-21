const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { AppError } = require('./errorHandler');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication token is required. Please log in.', 401, 'TOKEN_MISSING'));
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-flexstock-jwt-key');
    } catch (jwtErr) {
      // Let the global error handler translate JWT-specific error names into messages
      return next(jwtErr);
    }

    // Fetch user to ensure they are still active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return next(new AppError('Your account no longer exists. Please contact an administrator.', 401, 'USER_NOT_FOUND'));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact an administrator.', 403, 'ACCOUNT_DEACTIVATED'));
    }

    // Attach user metadata to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required. Please log in to continue.', 401, 'NOT_AUTHENTICATED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `You don't have permission to perform this action. Required role: ${allowedRoles.join(' or ')}.`,
          403,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
