const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { globalErrorHandler } = require('./middleware/errorHandler');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();

// ── Rate Limiters ──────────────────────────────────────────────

// Auth: 20 attempts per 15 minutes — brute-force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' }
});

// General API: 300 req/min per IP — allows normal burst usage
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded.' }
});

// Reports: export routes are CPU/memory intensive — cap at 10/min
const reportsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Report export limit reached. Wait 1 minute.' }
});

// Labels: PDF generation is CPU-intensive — cap at 20/min
const labelsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Label generation limit reached. Wait 1 minute.' }
});

// ── Middlewares ────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.APP_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Body limit: 1mb for JSON (10mb was too permissive — enables DoS via large payloads).
// Multipart/form-data for file uploads is handled separately in route middleware (multer).
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// ── Health Check ───────────────────────────────────────────────
// Used by Docker health checks and load balancer probes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────
const authRouter       = require('./routes/auth');
const categoriesRouter = require('./routes/categories');
const productsRouter   = require('./routes/products');
const inventoryRouter  = require('./routes/inventory');
const reportsRouter    = require('./routes/reports');
const usersRouter      = require('./routes/users');
const salesRouter      = require('./routes/sales');
const labelsRouter     = require('./routes/labels');
const settingsRouter   = require('./routes/settings');

app.use('/api/v1/auth/login',  authLimiter);
app.use('/api/v1/auth',        authRouter);
app.use('/api/v1/categories',  categoriesRouter);
app.use('/api/v1/products',    productsRouter);
app.use('/api/v1/inventory',   inventoryRouter);
app.use('/api/v1/reports',     reportsLimiter, reportsRouter);
app.use('/api/v1/users',       usersRouter);
app.use('/api/v1/sales',       salesRouter);
app.use('/api/v1/labels',      labelsLimiter, labelsRouter);
app.use('/api/v1/settings',    settingsRouter);

// ── 404 Handler — catches requests to undefined routes ────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `The requested resource '${req.originalUrl}' was not found on this server.`
    }
  });
});

// ── Global Error Handler ───────────────────────────────────────
// All errors forwarded via next(err) land here.
// Handles Prisma errors, JWT errors, validation, file-upload limits, and unknown 500s.
app.use(globalErrorHandler);

module.exports = app;
