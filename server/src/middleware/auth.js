const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { AppError } = require('./errorHandler');
const { recordSecurityIncident } = require('../lib/audit');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      recordSecurityIncident({
        req,
        category: 'authentication',
        action: 'token_missing',
        reason: 'Request missing bearer token',
        statusCode: 401
      });
      return next(new AppError('Authentication token is required. Please log in.', 401, 'TOKEN_MISSING'));
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-flexstock-jwt-key');
    } catch (jwtErr) {
      recordSecurityIncident({
        req,
        category: 'authentication',
        action: 'token_invalid',
        reason: jwtErr.message,
        statusCode: 401,
        metadata: { tokenName: jwtErr.name }
      });
      // Let the global error handler translate JWT-specific error names into messages
      return next(jwtErr);
    }

    // Fetch user to ensure they are still active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      recordSecurityIncident({
        req,
        category: 'authentication',
        action: 'token_user_missing',
        reason: 'Token resolved to a user that no longer exists',
        statusCode: 401,
        metadata: { userId: decoded.userId }
      });
      return next(new AppError('Your account no longer exists. Please contact an administrator.', 401, 'USER_NOT_FOUND'));
    }

    if (!user.isActive) {
      recordSecurityIncident({
        req,
        category: 'authentication',
        action: 'token_user_deactivated',
        reason: 'Disabled account attempted to authenticate',
        statusCode: 403,
        metadata: { userId: user.id, email: user.email, role: user.role }
      });
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
      recordSecurityIncident({
        req,
        actor: req.user,
        category: 'authorization',
        action: 'permission_denied',
        reason: `Required role: ${allowedRoles.join(' or ')}`,
        statusCode: 403,
        metadata: { requiredRoles: allowedRoles }
      });
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
