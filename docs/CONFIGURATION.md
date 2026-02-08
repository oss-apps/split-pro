# CONFIGURATION

This document lists SplitPro environment variables and how they are used. The authoritative list is `.env.example`.

## Required variables

### Database

- `POSTGRES_CONTAINER_NAME`: Docker container name used in compose setups.
- `POSTGRES_USER`: Database user.
- `POSTGRES_PASSWORD`: Database password.
- `POSTGRES_DB`: Database name.
- `POSTGRES_PORT`: Database port.
- `DATABASE_URL`: Full connection string used by the app.

### Authentication (NextAuth)

- `NEXTAUTH_SECRET`: Secret used to sign tokens. Generate with `openssl rand -base64 32`.
- `NEXTAUTH_URL`: Canonical app URL (used for callbacks and absolute URLs).
- `NEXTAUTH_URL_INTERNAL`: Optional internal URL for server-side calls when the app cannot reach `NEXTAUTH_URL`.

At least one provider must be configured. SplitPro does not support username/password.

### App behavior

- `DEFAULT_HOMEPAGE`: Sets the landing page route, e.g. `/home` or `/balances`.
- `ENABLE_SENDING_INVITES`: Enable email invites (requires SMTP config).
- `DISABLE_EMAIL_SIGNUP`: Disable email magic-link signup for new users.

## Optional variables

### Cache cleanup (pg_cron)

- `CLEAR_CACHE_CRON_RULE`: Cron rule for cache cleanup jobs (UTC).
- `CACHE_RETENTION_INTERVAL`: Postgres interval string that defines how long cached data can remain unused.

`pg_cron` does not support cron ranges or lists. See https://github.com/citusdata/pg_cron#what-is-pg_cron for details.

### SMTP (email provider)

Used for magic-link login and invites.

- `FROM_EMAIL`: Sender address.
- `EMAIL_SERVER_HOST`: SMTP host.
- `EMAIL_SERVER_PORT`: SMTP port.
- `EMAIL_SERVER_USER`: SMTP user.
- `EMAIL_SERVER_PASSWORD`: SMTP password.

### Bank integrations

#### Plaid (recommended)

- `PLAID_CLIENT_ID`: Plaid client id.
- `PLAID_SECRET`: Plaid secret.
- `PLAID_ENVIRONMENT`: `sandbox`, `development`, or `production`.
- `PLAID_COUNTRY_CODES`: Country codes list (per Plaid docs).
- `PLAID_INTERVAL_IN_DAYS`: Lookback window for fetching transactions (default 30 days).

#### GoCardless (deprecated)

- `GOCARDLESS_COUNTRY`
- `GOCARDLESS_SECRET_ID`
- `GOCARDLESS_SECRET_KEY`
- `GOCARDLESS_INTERVAL_IN_DAYS`

### OAuth providers

#### Google

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

#### Authentik

- `AUTHENTIK_ID`
- `AUTHENTIK_SECRET`
- `AUTHENTIK_ISSUER`: Must include the application slug, no trailing slash.

#### Keycloak

- `KEYCLOAK_ID`
- `KEYCLOAK_SECRET`
- `KEYCLOAK_ISSUER`: Must include the realm, e.g. `https://keycloak/realms/My_Realm`.

#### Generic OIDC

- `OIDC_NAME`: Lowercase provider name (used for IDs and icons).
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `OIDC_WELL_KNOWN_URL`: OpenID well-known discovery URL.
- `OIDC_ALLOW_DANGEROUS_EMAIL_LINKING`: Optional flag to allow email-based account linking.

### Web push notifications

- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_EMAIL`

### Feedback email

- `FEEDBACK_EMAIL`

### Currency conversions

- `CURRENCY_RATE_PROVIDER`: `frankfurter`, `openexchangerates`, or `nbp`.
- `OPEN_EXCHANGE_RATES_APP_ID`: Required if using Open Exchange Rates.

## Minimal examples

### Email-only auth

```bash
DATABASE_URL="postgresql://postgres:strong-password@localhost:5432/splitpro"
NEXTAUTH_SECRET="<generated>"
NEXTAUTH_URL="https://splitpro.example.com"
FROM_EMAIL="SplitPro <no-reply@example.com>"
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="smtp-user"
EMAIL_SERVER_PASSWORD="smtp-password"
```

### Google OAuth

```bash
DATABASE_URL="postgresql://postgres:strong-password@localhost:5432/splitpro"
NEXTAUTH_SECRET="<generated>"
NEXTAUTH_URL="https://splitpro.example.com"
GOOGLE_CLIENT_ID="<client-id>"
GOOGLE_CLIENT_SECRET="<client-secret>"
```

### OIDC (Keycloak)

```bash
DATABASE_URL="postgresql://postgres:strong-password@localhost:5432/splitpro"
NEXTAUTH_SECRET="<generated>"
NEXTAUTH_URL="https://splitpro.example.com"
OIDC_NAME="keycloak"
OIDC_CLIENT_ID="<client-id>"
OIDC_CLIENT_SECRET="<client-secret>"
OIDC_WELL_KNOWN_URL="https://keycloak.example.com/realms/My_Realm/.well-known/openid-configuration"
```

## Security notes

- Rotate `NEXTAUTH_SECRET` if it is ever exposed.
- Prefer `_FILE` suffix env vars when deploying with Docker secrets (supported for all values).
- in order to lock down your instance, you should configure either your OAuth/ OIDC provider to only allow trusted users, or disable email signups and invites with `DISABLE_EMAIL_SIGNUP=true`.
