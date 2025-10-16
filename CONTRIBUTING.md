# Contributing to Splitpro

If you plan to contribute to Splitpro, please take a moment to feel awesome ✨ People like you are what open source is about ♥. Any contributions, no matter how big or small, are highly appreciated.

## Adding a new locale

If you speak a language that is missing here or spot some mistakes in the translations, feel free to use our [Weblate project](https://hosted.weblate.org/projects/splitpro/), no coding knowledge required! The GUI is easy to navigate and you can read Weblate docs in case of any issues. If you are adding a new language and have translated all the keys, you can submit a PR updating [config](./next-i18next.config.js) and [client](./src/utils/i18n/client.ts) to enable its use in the app.

#### Adding locales when developing

To ease developer burden, you should only create English keys when adding new features. The rest should be updated by the community via Weblate!

## Adding a new currency rate provider

This is very straightforward and requires adding a new subclass in `./src/server/api/services/currencyRateService.ts`. You basically need to define a method that given a currency pair and a date, returns the appropriate date. If the provider returns more currencies in one API call, you can also return more, as well as only return an intermediate currencies, the inherited methods will put it all together!

## Before getting started

- Before jumping into a PR be sure to search [existing PRs](https://github.com/oss-apps/split-pro/pulls) or [issues](https://github.com/oss-apps/split-pro/issues) for an open or closed item that relates to your submission.
- Select an issue from [here](https://github.com/oss-apps/split-pro/issues) or create a new one
- Consider the results from the discussion on the issue

## Taking issues

Before taking an issue, ensure that:

- The issue is clearly defined and understood
- No one has been assigned to the issue
- No one has expressed intention to work on it

You can then:

1. Comment on the issue with your intention to work on it
2. Begin work on the issue

Always feel free to ask questions or seek clarification on the issue.

## Developing

The development branch is <code>main</code>. All pull requests should be made against this branch. If you need help getting started, go to our GitHub Discussions.

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your
   own GitHub account and then
   [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device.
2. Create a new branch:

- Create a new branch (include the issue id and something readable):

  ```sh
  git checkout -b feat/doc-999-somefeature-that-rocks
  ```

3. See the [Developer Setup](https://github.com/oss-apps/split-pro?tab=readme-ov-file#developer-setup) for more setup details.

## Linting

This projects implements `oxlint` for linting. When developing please make sure to have an IDE integration enabled and watch out not to introduce new warnings. It is also nice to follow the boy scout rule and leave the code you modify with a little less warnings. Checks are enforced on CI for linting, formatting and typing, so run necessary checks before pushing.

## Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to automatically run code quality checks before each commit:

- **Prettier**: Automatically formats code according to the project's style guide
- **oxlint**: Runs linting checks and automatically fixes issues where possible

The pre-commit hooks are automatically installed when you run `pnpm install`. If you need to manually set them up:

```bash
pnpm exec husky install
```

### Bypassing pre-commit hooks

In rare cases where you need to bypass the pre-commit checks, you can use:

```bash
git commit --no-verify -m "your commit message"
```

**Note:** Only use `--no-verify` when absolutely necessary, as it skips important code quality checks.

## Building

> **Note**
> Please ensure you can make a full production build before pushing code or creating PRs.

You can build the project with:

```bash
pnpm build
```

## Seed data

There is an extensive seed data generation script, which handles the creation of tens of users, groups and thousands of expenses with various categories, names, split types etc.
You can use it for development and it is strongly advised, when reporting issues to point to the seeded user/group/expense as the data creation
is deterministic. If the database was not seeded automatically, you can run `pnpm prisma migrate reset` to get back to the pure seeded state.
There is also a markdown report being generated on each run and you can see it in the project root directory. It features some useful statistic
like the most connected accounts, which you can log into to have a populated app.

If you need to tweak the script for your use case (like faster seeding with less expenses or DB stress testing), feel free to tweak the parameters in the `src/dummies` directory.
