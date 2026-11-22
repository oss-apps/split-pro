# Maps `services.split-pro` options to the environment variables that src/env.ts reads.
# This is the only place where that mapping is defined.
#
#   ENV_VAR = {
#     path = "dotted.option.path";   # under services.split-pro
#     type = types.str;
#     description = "...";
#     default = ...;                 # optional; when omitted, the option defaults to null and
#                                    # the app uses its own default. Only set it when NixOS
#                                    # itself uses the value.
#     example = ...;                 # optional
#     secret = true;                 # optional: also generates `<name>File`
#   };
#
# `nix/env-coverage.nix` fails the build if src/env.ts gains a variable that is missing here.
{ lib }:
let
  inherit (lib) types;
  inherit (types) str bool;

  vars = {
    # --- General ---
    NEXTAUTH_URL = {
      path = "url";
      type = str;
      description = "Public URL of the instance, e.g. `https://split.example.com`.";
    };
    NEXTAUTH_URL_INTERNAL = {
      path = "internalUrl";
      type = str;
      description = "URL used for server-side calls when the server cannot reach {option}`services.split-pro.url`. Defaults to {option}`services.split-pro.url`.";
    };
    PORT = {
      path = "port";
      type = types.port;
      default = 3000;
      description = "Port the web server listens on.";
    };
    HOSTNAME = {
      path = "host";
      type = str;
      default = "127.0.0.1";
      description = "Address the web server binds to.";
    };
    DEFAULT_HOMEPAGE = {
      path = "defaultHomepage";
      type = str;
      example = "/balances";
      description = "Landing page route, e.g. `/home` or `/balances`.";
    };

    # --- Authentication ---
    NEXTAUTH_SECRET = {
      path = "auth.secret";
      type = str;
      secret = true;
      description = "Secret used to sign sessions. Generated on first start when unset and {option}`services.split-pro.autoGenerateSecrets` is enabled.";
    };
    DISABLE_EMAIL_SIGNUP = {
      path = "auth.disableEmailSignup";
      type = bool;
      description = "Disable email magic-link sign-up for new users.";
    };
    INVITE_ONLY = {
      path = "auth.inviteOnly";
      type = bool;
      description = "Only allow sign-up for invited users.";
    };
    OAUTH_AUTO_REDIRECT = {
      path = "auth.autoRedirect";
      type = bool;
      description = "Redirect straight to the OAuth provider when it is the only sign-in method.";
    };
    ENABLE_USER_DISCOVERY = {
      path = "auth.userDiscovery";
      type = bool;
      description = "Show all instance users in the participant picker. Only enable on private instances.";
    };
    GOOGLE_CLIENT_ID = {
      path = "auth.google.clientId";
      type = str;
      secret = true;
      description = "Google OAuth client ID.";
    };
    GOOGLE_CLIENT_SECRET = {
      path = "auth.google.clientSecret";
      type = str;
      secret = true;
      description = "Google OAuth client secret.";
    };
    AUTHENTIK_ID = {
      path = "auth.authentik.clientId";
      type = str;
      secret = true;
      description = "Authentik OAuth client ID.";
    };
    AUTHENTIK_SECRET = {
      path = "auth.authentik.clientSecret";
      type = str;
      secret = true;
      description = "Authentik OAuth client secret.";
    };
    AUTHENTIK_ISSUER = {
      path = "auth.authentik.issuer";
      type = str;
      description = "Authentik issuer URL.";
    };
    KEYCLOAK_ID = {
      path = "auth.keycloak.clientId";
      type = str;
      secret = true;
      description = "Keycloak OAuth client ID.";
    };
    KEYCLOAK_SECRET = {
      path = "auth.keycloak.clientSecret";
      type = str;
      secret = true;
      description = "Keycloak OAuth client secret.";
    };
    KEYCLOAK_ISSUER = {
      path = "auth.keycloak.issuer";
      type = str;
      description = "Keycloak issuer URL.";
    };
    OIDC_NAME = {
      path = "auth.oidc.name";
      type = str;
      description = "Display name of the generic OIDC provider.";
    };
    OIDC_CLIENT_ID = {
      path = "auth.oidc.clientId";
      type = str;
      secret = true;
      description = "Generic OIDC client ID.";
    };
    OIDC_CLIENT_SECRET = {
      path = "auth.oidc.clientSecret";
      type = str;
      secret = true;
      description = "Generic OIDC client secret.";
    };
    OIDC_WELL_KNOWN_URL = {
      path = "auth.oidc.wellKnownUrl";
      type = str;
      description = "OIDC discovery URL (`.../.well-known/openid-configuration`).";
    };
    OIDC_ALLOW_DANGEROUS_EMAIL_LINKING = {
      path = "auth.oidc.allowDangerousEmailLinking";
      type = bool;
      description = "Link OIDC accounts to existing users by email address.";
    };

    # --- Email ---
    FROM_EMAIL = {
      path = "email.from";
      type = str;
      description = "Sender address for outgoing mail.";
    };
    ENABLE_SENDING_INVITES = {
      path = "email.enableInvites";
      type = bool;
      description = "Send invitation emails (needs SMTP).";
    };
    EMAIL_TLS_REJECT_UNAUTHORIZED = {
      path = "email.tlsRejectUnauthorized";
      type = bool;
      description = "Reject SMTP servers with invalid TLS certificates.";
    };
    EMAIL_SERVER_HOST = {
      path = "email.server.host";
      type = str;
      description = "SMTP server host.";
    };
    EMAIL_SERVER_PORT = {
      path = "email.server.port";
      type = types.port;
      description = "SMTP server port.";
    };
    EMAIL_SERVER_USER = {
      path = "email.server.user";
      type = str;
      description = "SMTP user name.";
    };
    EMAIL_SERVER_PASSWORD = {
      path = "email.server.password";
      type = str;
      secret = true;
      description = "SMTP password.";
    };

    # --- Recurring expenses ---
    RECURRENCE_TIME = {
      path = "recurrence.time";
      type = types.strMatching "([01][0-9]|2[0-3]):[0-5][0-9]";
      description = "Time of day (`HH:mm`, in {option}`services.split-pro.recurrence.timeZone`) at which recurring expenses are created. SplitPro defaults to `00:00`.";
    };
    EXCLUDE_FUTURE_EXPENSES = {
      path = "recurrence.excludeFutureExpenses";
      type = bool;
      description = "Exclude expenses dated in the future from balances.";
    };

    # --- Push notifications ---
    WEB_PUSH_EMAIL = {
      path = "pushNotifications.email";
      type = str;
      description = "Contact address for web push (VAPID). Setting it enables push notifications.";
    };
    WEB_PUSH_PUBLIC_KEY = {
      path = "pushNotifications.publicKey";
      type = str;
      description = "VAPID public key. Generated with the private key when both are unset.";
    };
    WEB_PUSH_PRIVATE_KEY = {
      path = "pushNotifications.privateKey";
      type = str;
      secret = true;
      description = "VAPID private key.";
    };

    # --- Currency ---
    CURRENCY_RATE_PROVIDER = {
      path = "currency.rateProvider";
      type = types.enum [
        "frankfurter"
        "openexchangerates"
        "nbp"
      ];
      description = "Exchange rate provider.";
    };
    OPEN_EXCHANGE_RATES_APP_ID = {
      path = "currency.openExchangeRatesAppId";
      type = str;
      secret = true;
      description = "Open Exchange Rates app ID.";
    };

    # --- Bank integrations ---
    GOCARDLESS_COUNTRY = {
      path = "bankIntegration.gocardless.country";
      type = str;
      description = "GoCardless country code.";
    };
    GOCARDLESS_SECRET_ID = {
      path = "bankIntegration.gocardless.secretId";
      type = str;
      secret = true;
      description = "GoCardless secret ID.";
    };
    GOCARDLESS_SECRET_KEY = {
      path = "bankIntegration.gocardless.secretKey";
      type = str;
      secret = true;
      description = "GoCardless secret key.";
    };
    GOCARDLESS_INTERVAL_IN_DAYS = {
      path = "bankIntegration.gocardless.intervalInDays";
      type = types.ints.positive;
      description = "How many days of transactions to fetch.";
    };
    PLAID_CLIENT_ID = {
      path = "bankIntegration.plaid.clientId";
      type = str;
      secret = true;
      description = "Plaid client ID.";
    };
    PLAID_SECRET = {
      path = "bankIntegration.plaid.secret";
      type = str;
      secret = true;
      description = "Plaid secret.";
    };
    PLAID_ENVIRONMENT = {
      path = "bankIntegration.plaid.environment";
      type = types.enum [
        "sandbox"
        "development"
        "production"
      ];
      description = "Plaid environment.";
    };
    PLAID_COUNTRY_CODES = {
      path = "bankIntegration.plaid.countryCodes";
      type = types.commas;
      example = "US,GB";
      description = "Comma-separated Plaid country codes.";
    };
    PLAID_INTERVAL_IN_DAYS = {
      path = "bankIntegration.plaid.intervalInDays";
      type = types.ints.positive;
      description = "How many days of transactions to fetch.";
    };

    # --- Misc ---
    UPLOAD_MAX_FILE_SIZE_MB = {
      path = "uploads.maxFileSizeMb";
      type = types.ints.positive;
      description = "Maximum receipt upload size in MB.";
    };
    CLEAR_CACHE_CRON_RULE = {
      path = "cache.clearCronRule";
      type = str;
      example = "0 2 * * 0";
      description = "Cron rule for clearing cached data.";
    };
    CACHE_RETENTION_INTERVAL = {
      path = "cache.retentionInterval";
      type = str;
      example = "2 days";
      description = "How long cached data is kept (PostgreSQL interval).";
    };
    FEEDBACK_EMAIL = {
      path = "feedback.email";
      type = str;
      description = "Address receiving user feedback.";
    };
    DISCORD_WEBHOOK_URL = {
      path = "feedback.discordWebhookUrl";
      type = str;
      secret = true;
      description = "Discord webhook for feedback and error notifications.";
    };
  };
in
{
  # Env vars from src/env.ts that the module sets itself (or that don't belong in a service config).
  handledByModule = [
    "DATABASE_URL"
    "UPLOAD_DIR"
    "NODE_ENV"
    "TEST_MODE"
    "DOCKER_OUTPUT"
  ];

  # Normalised for the module: `env` added, `path` split into a list, defaults filled in.
  rows = lib.mapAttrsToList (
    env: v:
    {
      default = null;
      secret = false;
    }
    // v
    // {
      inherit env;
      path = lib.splitString "." v.path;
    }
  ) vars;
}
