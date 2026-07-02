const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { recordAuditEvent, recordSecurityIncident } = require('../lib/audit');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      recordSecurityIncident({
        req,
        category: 'authentication',
        action: 'login_failed',
        reason: 'Missing email or password',
        statusCode: 401,
        metadata: { email: email || null }
      });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) {
      recordSecurityIncident({
        req,
        category: 'authentication',
        action: 'login_failed',
        reason: 'Invalid credentials or inactive account',
        statusCode: 401,
        metadata: { email }
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      recordSecurityIncident({
        req,
        actor: { id: user.id, name: user.name, email: user.email, role: user.role },
        category: 'authentication',
        action: 'login_failed',
        reason: 'Incorrect password',
        statusCode: 401,
        metadata: { email }
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'super-secret-flexstock-jwt-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET || 'super-secret-flexstock-refresh-key',
      { expiresIn: '7d' }
    );

    recordAuditEvent({
      req,
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'login_success',
      resourceType: 'auth_session',
      resourceId: user.id,
      reason: 'User successfully authenticated',
      outcome: 'success',
      statusCode: 200,
      metadata: { email: user.email }
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'super-secret-flexstock-refresh-key');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User is inactive or not found' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'super-secret-flexstock-jwt-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    recordAuditEvent({
      req,
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'refresh_session',
      resourceType: 'auth_session',
      resourceId: user.id,
      reason: 'Access token refreshed',
      outcome: 'success',
      statusCode: 200,
      metadata: { email: user.email }
    });

    res.json({ accessToken });
  } catch (error) {
    recordSecurityIncident({
      req,
      category: 'authentication',
      action: 'refresh_failed',
      reason: 'Invalid or expired refresh token',
      statusCode: 401
    });
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

const logout = async (req, res, next) => {
  try {
    // Since JWT is stateless, client can just delete the token.
    // In a production setup, you could blacklist the token here.
    recordAuditEvent({
      req,
      actor: req.user || null,
      action: 'logout',
      resourceType: 'auth_session',
      resourceId: req.user?.id || null,
      reason: 'User ended session',
      outcome: 'success',
      statusCode: 200
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  me
};
