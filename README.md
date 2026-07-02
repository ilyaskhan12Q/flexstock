# FlexStock

[![CI](https://github.com/ilyaskhan12Q/flexstock/actions/workflows/ci.yml/badge.svg)](https://github.com/ilyaskhan12Q/flexstock/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

> **FlexStock** — A self-hostable, white-label inventory management system. One codebase. Any business. Zero cloud dependency.

---

## Features

- **Product-agnostic** — configure product fields per category (pharmacy, clothing, hardware — all supported)
- **Real-time stock updates** via Socket.IO — all connected browsers sync instantly
- **Role-based access control** — Admin, Manager, Staff with enforced permissions
- **Dashboard** with charts, KPIs, and live low-stock alerts
- **Label & barcode printing** — PDF label sheets + optional thermal ZPL output
- **Inventory movements** — Stock In, Out, Adjustment, Transfer, with full audit trail
- **Optional Sales module** — POS checkout screen, receipt printing, sales history
- **PDF & Excel exports** — professional reports with business logo
- **Settings panel** — business name, logo, currency, locations, module toggles
- **Immutable audit logs** — sensitive changes are recorded with actor, time, request ID, and context
- **Security monitoring** — failed logins, permission denials, and blocked destructive actions are flagged
- **One-command install** — `./install.sh` handles everything

---

## Screenshots

> Dashboard with real-time KPIs, stock charts, and live low-stock alerts

---

## Quick Start

### Option A — Docker (Recommended)

```bash
git clone https://github.com/ilyaskhan12Q/flexstock.git
cd flexstock
cp .env.example .env
# Edit .env with your APP_NAME, DB credentials, and JWT secrets
docker-compose up -d
```

App runs at **http://localhost:3000**

Default credentials after seed:
- Admin: `admin@flexstock.com` / `admin123`
- Manager: `manager@flexstock.com` / `manager123`
- Staff: `staff@flexstock.com` / `staff123`

> WARNING: Change all passwords immediately after first login.

### Option B — Manual Install (VPS / Linux Server)

```bash
git clone https://github.com/ilyaskhan12Q/flexstock.git
cd flexstock
cp .env.example .env
# Edit .env
./install.sh
```

The install script handles: npm install, prisma migrate, seeding, and frontend build.

---

## Docker Setup

Full stack (PostgreSQL + API + Frontend):

```bash
docker-compose up -d          # Start all services
docker-compose logs -f server # Follow server logs
docker-compose down           # Stop all services
```

Production deployment:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Configuration

All configuration is done via `.env`. Copy `.env.example` and edit:

```env
APP_NAME="My Pharmacy"       # Shown in header and reports
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-long-secret
CURRENCY_SYMBOL=PKR
```

See [docs/configuration.md](./docs/configuration.md) for all available variables.

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](./docs/architecture.md) | System design, data flow, real-time strategy |
| [API Reference](./docs/api.md) | All endpoints with request/response examples |
| [Deployment](./docs/deployment.md) | VPS, Docker, shared hosting setup |
| [Configuration](./docs/configuration.md) | All `.env` variables explained |
| [Custom Fields](./docs/custom-fields.md) | How the field builder works |
| [Label Printing](./docs/label-printing.md) | Tier 1 PDF + Tier 2 thermal setup |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Security

FlexStock now keeps an append-only audit trail for sensitive actions including users, categories, products, stock movements, sales, and settings. Failed authentication, permission denials, and blocked destructive actions are also recorded as security incidents so administrators can trace suspicious activity.

For security vulnerabilities, please see [SECURITY.md](./SECURITY.md) — **do not open a public issue**.

---

## License

[MIT](./LICENSE) © 2026 FlexStock Contributors
