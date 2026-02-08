# AUTHENTICATION

SplitPro uses NextAuth for authentication. At least one provider must be configured.
Username and password login is not supported.

## Supported providers

- Email (magic link)
- OAuth (Authentik, Google)
- OIDC (Keycloak, or other custom provider)

## Required environment variables

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

Provider-specific variables are listed in [CONFIGURATION](CONFIGURATION.md).

## OIDC callback

For generic OIDC providers, configure the callback URL as:

```
https://<your-domain>/api/auth/callback/oidc
```

## Provider setup notes

### Email (magic link)

- Configure SMTP settings (`FROM_EMAIL`, `EMAIL_SERVER_*`).
- Enable signups and invites if you want new users to join by email.

### Google OAuth

- Create OAuth credentials at https://console.cloud.google.com/.
- Set the authorized redirect URI to:

```
https://<your-domain>/api/auth/callback/google
```

### OIDC (Authentik/Keycloak/custom)

- Ensure the issuer is correct for your provider.
- Configure the callback URL shown above.

## Troubleshooting

- If you see "No providers configured", check your env vars and redeploy.
- Callback URL mismatches are usually caused by incorrect `NEXTAUTH_URL`.
- If sign-in works locally but not in production, set `NEXTAUTH_URL_INTERNAL`.

## Locking down an instance

To prevent new user signups and keep a closed instance:

- Set `DISABLE_EMAIL_SIGNUP=true` to prevent email signups.
- Set `ENABLE_SENDING_INVITES=false` to block invite emails.

You can still allow access via trusted OAuth or OIDC providers.
