const fs = require('fs');
const path = require('path');

const prisma = require('../lib/prisma');

// Settings are stored in a local JSON file (no DB model needed — single-tenant)
const SETTINGS_PATH = path.join(__dirname, '../../../settings.json');

const getDefaultSettings = () => ({
  businessName: process.env.APP_NAME || 'FlexStock',
  businessAddress: '',
  currencySymbol: process.env.CURRENCY_SYMBOL || 'PKR',
  dateFormat: process.env.DATE_FORMAT || 'DD/MM/YYYY',
  logoUrl: null,
  defaultMinStock: 5,
  locations: ['Main'],
  modules: {
    salesEnabled: true,
    labelPrintingEnabled: true,
    thermalPrinting: false
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER || '',
    alertEmail: process.env.ALERT_EMAIL || '',
    enabled: false
  }
});

const readSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      return { ...getDefaultSettings(), ...JSON.parse(raw) };
    }
  } catch {
    // fall through to default
  }
  return getDefaultSettings();
};

const writeSettings = (data) => {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

// GET /api/v1/settings
const getSettings = async (req, res, next) => {
  try {
    const settings = readSettings();
    // Never expose SMTP password
    const safe = { ...settings };
    if (safe.smtp) delete safe.smtp.password;
    res.json(safe);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/settings
const updateSettings = async (req, res, next) => {
  try {
    const current = readSettings();
    const updated = {
      ...current,
      ...req.body,
      // Deep merge modules and smtp
      modules: { ...current.modules, ...(req.body.modules || {}) },
      smtp: { ...current.smtp, ...(req.body.smtp || {}) }
    };

    // Handle logo upload
    if (req.file) {
      updated.logoUrl = `/uploads/${req.file.filename}`;
    }

    writeSettings(updated);

    // Return without smtp password
    const safe = { ...updated };
    if (safe.smtp) delete safe.smtp.password;
    res.json(safe);
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/settings/locations
const getLocations = async (req, res, next) => {
  try {
    const settings = readSettings();
    res.json({ locations: settings.locations || ['Main'] });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/settings/locations
const addLocation = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Location name is required' });
    }

    const settings = readSettings();
    const trimmed = name.trim();

    if (settings.locations.includes(trimmed)) {
      return res.status(400).json({ error: 'Location already exists' });
    }

    settings.locations.push(trimmed);
    writeSettings(settings);

    res.status(201).json({ locations: settings.locations });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/settings/locations/:name
const removeLocation = async (req, res, next) => {
  try {
    const { name } = req.params;

    if (name === 'Main') {
      return res.status(400).json({ error: 'Cannot delete the default Main location' });
    }

    // Check if location has inventory
    const hasInventory = await prisma.inventory.findFirst({ where: { location: name } });
    if (hasInventory) {
      return res.status(400).json({ error: `Location '${name}' has active inventory. Transfer stock first.` });
    }

    const settings = readSettings();
    settings.locations = settings.locations.filter(l => l !== name);
    writeSettings(settings);

    res.json({ locations: settings.locations });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/settings/backup  — returns a JSON dump of all data
const exportBackup = async (req, res, next) => {
  try {
    const [users, categories, products, inventory, movements, sales] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } }),
      prisma.category.findMany({ include: { fields: true } }),
      prisma.product.findMany(),
      prisma.inventory.findMany(),
      prisma.stockMovement.findMany(),
      prisma.sale.findMany({ include: { items: true } })
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      settings: readSettings(),
      data: { users, categories, products, inventory, movements, sales }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="flexstock-backup-${Date.now()}.json"`);
    res.json(backup);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getLocations,
  addLocation,
  removeLocation,
  exportBackup
};
