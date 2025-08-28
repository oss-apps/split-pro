# Contributing to Splitpro

If you plan to contribute to Splitpro, please take a moment to feel awesome ✨ People like you are what open source is about ♥. Any contributions, no matter how big or small, are highly appreciated.

## Adding a new locale

If you speak a language that is missing here or spot some mistakes in the translations, feel free to submit a PR, not much coding knowledge required! The process involves copying the files in `public/locales/en` and creating a new folder with your locale. Then it is a matter of updating the values themselves and adding your locale in the [config](./next-i18next.config.js) and [client](./src/utils/i18n/client.ts).

Before submitting a PR, please run the local environment and check that it looks alright in the UI. Also, by submitting a PR, you assume the role of a maintainer of the translation, as possibly no one else will be able to check it.

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

The development branch is <code>main</code>. All pull requests should be made against this branch. If you need help getting started, send an email to koushik@ossapps.dev.

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
