/**
 * Shared Prisma client singleton — prevents connection pool exhaustion.
 * 
 * Why singleton: each PrismaClient opens its own connection pool (default: 10).
 * With 8+ controllers each creating their own instance, you'd have 80+ open DB
 * connections. One shared instance means one pool, properly bounded.
 * 
 * Pool sizing:
 * - connection_limit: 10 is Prisma's default and correct for a single-server
 *   deployment. Increase to 20-30 only if you run multiple Node workers (PM2 cluster).
 * - pool_timeout: fail fast (10s) rather than queue requests indefinitely.
 * 
 * Connection string parameters are appended to DATABASE_URL as query params
 * per the Prisma connection URL spec.
 */

const { PrismaClient } = require('@prisma/client');

const buildDatabaseUrl = () => {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL environment variable is not set');

  try {
    const url = new URL(base);
    // Only set pool params if not already set (allow .env override)
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '10');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '10');
    }
    return url.toString();
  } catch {
    // If URL parsing fails (e.g. in test env with mocked DATABASE_URL), return as-is
    return base;
  }
};

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: buildDatabaseUrl()
    }
  },
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error']
});

// Graceful shutdown — release connections on process exit
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
