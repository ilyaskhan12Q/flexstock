const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const { recordAuditEvent, recordSecurityIncident } = require('../lib/audit');

const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    recordAuditEvent({
      req,
      actor: req.user,
      action: 'create_user',
      resourceType: 'user',
      resourceId: user.id,
      reason: 'Created user account',
      after: user,
      metadata: { role }
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, isActive } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const data = {
      name,
      email,
      role,
      isActive
    };

    if (password) {
      data.password = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    recordAuditEvent({
      req,
      actor: req.user,
      action: 'update_user',
      resourceType: 'user',
      resourceId: id,
      reason: 'Updated user account',
      before: user,
      after: updated,
      metadata: { changedEmail: email && email !== user.email, changedRole: role && role !== user.role, changedStatus: isActive !== undefined && isActive !== user.isActive }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't let users delete themselves
    if (req.user.id === id) {
      recordSecurityIncident({
        req,
        actor: req.user,
        category: 'destructive_action_blocked',
        action: 'delete_user_blocked',
        resourceType: 'user',
        resourceId: id,
        reason: 'User attempted to delete their own account'
      });
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    // We can either soft-delete (deactivate) or hard-delete. Deactivating is safer for audit logging.
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    recordAuditEvent({
      req,
      actor: req.user,
      action: 'deactivate_user',
      resourceType: 'user',
      resourceId: id,
      reason: 'Deactivated user account',
      before: user,
      after: { ...user, isActive: false },
      metadata: { selfDeleteAttempt: req.user.id === id }
    });

    res.json({ message: 'User account deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
