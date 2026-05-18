# BANK TRANSACTIONS

Bank transaction integration lets you import transactions and turn them into SplitPro expenses.

This feature was provided by @alexanderwassbjer, who is currently maintaining related issues.

## Providers

- Plaid is the recommended provider.
- GoCardless is deprecated and no longer accepts new signups.

For Plaid-supported countries and institutions, see https://plaid.com/docs/institutions/.

## Setup (Plaid)

1. Create a Plaid account and obtain your `client_id` and `secret`.
2. Add the Plaid environment variables to your deployment.
3. Verify configuration from the account page in SplitPro.

See [CONFIGURATION](CONFIGURATION.md) for the exact variables.

## How to use

1. Open your account page and click “Connect to bank.”
2. When adding an expense (group or friend), open the “Transactions” tab.
3. Select transactions and submit them to create expenses.

## Notes

- Duplicate detection prevents importing the same transaction twice.
- Multi-add is supported for batch creation.

## Troubleshooting

- If the "Connect to bank" option does not appear, confirm your Plaid keys and environment.
- Ensure `PLAID_COUNTRY_CODES` matches the institutions you want to connect.

## UI walkthrough video

- Bank transaction import: https://github.com/user-attachments/assets/ab853a09-0020-473d-860b-df16ce8b2c63
