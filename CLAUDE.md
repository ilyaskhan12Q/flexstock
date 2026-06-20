# FlexStock - Developer & Operations Guide

This handbook describes the project structure, commands, coding standards, and database design.

---

## Commands

### Installation & Deployment Setup
* **Automatic Provisioning**: Run `./install.sh` at the root directory to spin up PostgreSQL containers, synchronize environment variables, build the React project, and deploy seeds.
* **Prisma Seed Database**: `npm run prisma:seed`

### Active Development
* **Launch All Services**: `npm run dev` (Runs concurrently server dev + client dev)
* **Dev Server Backend**: `npm run dev:server`
* **Dev Client Frontend**: `npm run dev:client`

### Database Migrations
* **Generate Prisma Client**: `npm run prisma:generate`
* **Create/Run Migrations**: `npm run prisma:migrate`

### Quality & Verification
* **Backend Vitest Suites**: `npm test` inside `server/` or `npm test --workspace=server` from root.

---

## Codebase Structure

```
├── client/                      # Vite + React Frontend
│   ├── src/
│   │   ├── components/          # Reusable Form & Layout Elements
│   │   ├── hooks/               # Socket & State Hooks
│   │   ├── pages/               # Dashboards, Catalog, POS register, Schemas
│   │   ├── store/               # Zustand Global Auth & Notification Stores
│   │   ├── api.js               # Central Axios Interceptor
│   │   ├── App.jsx              # Routes Guarding configuration
│   │   └── main.jsx
│   └── package.json
│
├── server/                      # Node + Express Backend
│   ├── prisma/
│   │   ├── schema.prisma        # Postgres Schema
│   │   └── seed.js              # Categories & Users seed script
│   ├── src/
│   │   ├── controllers/         # REST API Handlers & Validators
│   │   ├── middleware/          # JWT & Role Access Gatekeepers
│   │   ├── routes/              # Express API Routes maps
│   │   ├── tests/               # Vitest Integration tests
│   │   ├── app.js               # App middleware binding exports
│   │   └── index.js             # HTTP & Socket.IO listener launchpad
│   └── package.json
│
├── docker-compose.yml           # Database infrastructure
└── install.sh                   # Automated build & setup script
```

---

## Dynamic Configurator Schema Pattern

FlexStock implements an adaptive multi-tenant architecture:
1. **Category Definition (`Category`)**: Contains name, styling properties (`color`, `icon`).
2. **Dynamic Attributes Config (`ProductField`)**: Belongs to a Category. Defines custom property validations (`isRequired`, `fieldType` like `NUMBER`, `DATE`, `DROPDOWN`, `BOOLEAN`, `TEXT`).
3. **Product Entity (`Product`)**: Stores standard properties (SKU, name, prices, barcode). Custom fields are saved inside a JSON column (`customFields`), which is dynamically checked against `ProductField` schemas before database insertions and updates.
4. **Movements & Stock (`Inventory` & `InventoryMovement`)**: Quantities are calculated on demand, updated instantly on checking transaction inputs, and broadcasted to cashiers via Socket.IO events (`stock:updated`, `alert:low-stock`).
