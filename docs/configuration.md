# Configuration Reference

All environment variables used by FlexStock, explained.

---

## App Settings

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_NAME` | Yes | `FlexStock` | Business name shown in header and PDF reports |
| `APP_URL` | Yes | `http://localhost:3000` | Full URL of the app (used in CORS) |
| `PORT` | No | `3000` | Port the Express server listens on |
| `NODE_ENV` | Yes | `development` | Set to `production` in live deployments |

## Database

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Full PostgreSQL connection string |

Example: `postgresql://user:password@localhost:5432/flexstock`

## Authentication

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Long random string for signing access tokens (32+ chars) |
| `JWT_EXPIRES_IN` | No | Token expiry. Default: `8h` |
| `REFRESH_TOKEN_SECRET` | Yes | Separate secret for refresh tokens |

## Locale & Currency

| Variable | Default | Description |
|---|---|---|
| `CURRENCY_SYMBOL` | `PKR` | Currency symbol shown in UI and reports |
| `DATE_FORMAT` | `DD/MM/YYYY` | Display date format |

## Email Alerts (Optional)

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (usually 587 for TLS) |
| `SMTP_USER` | SMTP login username |
| `SMTP_PASS` | SMTP login password |
| `ALERT_EMAIL` | Email address to send low-stock alerts to |

Leave all SMTP variables blank to disable email alerts.

## Label Printing (Optional)

| Variable | Default | Description |
|---|---|---|
| `THERMAL_PRINTING` | `false` | Set to `true` to enable QZ Tray ZPL output |
| `LABEL_TEMPLATE` | `2x4` | Default label layout: `2x4` \| `3x5` \| `single` |
