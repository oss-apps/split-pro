# CURRENCY CONVERSIONS

SplitPro can convert expenses and balances between currencies using cached exchange rates.

## What you can do

- Display balances in a single currency.
- Convert an individual expense into another currency.
- Convert group balances on the fly from the balance view.
- Edit existing currency conversion transactions.

## How conversions work

- Rates are fetched from the configured provider and cached in the database.
- Conversions can be created for an expense and later edited if needed.
- Group balances can be converted on demand without changing the original expense currency.

## Providers and limitations

Exchange rate APIs are typically rate limited or paywalled. SplitPro supports three providers and caches results in the database to reduce API usage.

- Frankfurter (https://frankfurter.dev/)
  - Free, but limited currency set.
  - Check availability at https://api.frankfurter.dev/v1/currencies.
- Open Exchange Rates (https://openexchangerates.org/)
  - Free tier includes 1000 requests/day and wide currency coverage.
  - Free tier uses USD as the base currency; SplitPro joins rates internally.
  - Requires an API key.
- NBP (https://api.nbp.pl/en.html)
  - Polish National Bank.
  - No API key required, base currency PLN.
  - Table A updates daily, table B (less common currencies) updates weekly.

## Provider comparison

| Provider            | Base currency | Coverage | API key | Notes                      |
| ------------------- | ------------- | -------- | ------- | -------------------------- |
| Frankfurter         | EUR           | Limited  | No      | Free, limited currency set |
| Open Exchange Rates | USD           | Broad    | Yes     | Free tier 1000 req/day     |
| NBP                 | PLN           | Medium   | No      | Table B updates weekly     |

## Configuration

Set your provider in `CURRENCY_RATE_PROVIDER` and supply `OPEN_EXCHANGE_RATES_APP_ID` if you use Open Exchange Rates. See [CONFIGURATION](CONFIGURATION.md) for all related variables.

## Notes

- Rates are cached in the database to minimize calls and stay within provider limits.
- Provider coverage and rate freshness depend on the selected provider.

## Common use cases

- Display all balances in your home currency.
- Convert a foreign receipt into the group currency.
- Compare group balances across multiple currencies.

## UI walkthrough videos

- Expense conversion: https://github.com/user-attachments/assets/95ab9a6b-44da-419e-a7ee-d6314af37d03
- Group balance conversion: https://github.com/user-attachments/assets/63b62b2b-be0f-4fe4-9be9-e30b5caaaf06
