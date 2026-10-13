# Obsolete translation keys

Remove in part 2 of the PR

Mark these keys as obsolete in Weblate. Remove them from all catalogs after
release; older app versions may still use them.

Keep the current `common` and `home` namespaces.

## Namespace `common`

| Obsolete key                                  | Replacement                                                                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `actors.you_accusativus`                      | Complete ICU messages                                                                                                               |
| `actors.you_dativus`                          | Complete ICU messages                                                                                                               |
| `expense_details.balance_list.are_settled_up` | `expense_details.balance_list.settled`                                                                                              |
| `expense_details.balance_list.is_settled_up`  | `expense_details.balance_list.settled`                                                                                              |
| `ui.added_by`                                 | `expense_metadata.added_by`                                                                                                         |
| `ui.deleted_by`                               | `expense_metadata.deleted_by`                                                                                                       |
| `ui.edited_by`                                | `expense_metadata.edited_by`                                                                                                        |
| `ui.balance`                                  | `balance_summary.more` (`count`)                                                                                                    |
| `ui.balances`                                 | `balance_summary.more` (`count`)                                                                                                    |
| `ui.expense.for`                              | `activity.*_for_expense`, `expense_list.conversion_for_users`                                                                       |
| `ui.expense.you.deleted`                      | `activity.user_deleted_expense` (`actor`)                                                                                           |
| `ui.expense.user.deleted`                     | `activity.user_deleted_expense` (`actor`)                                                                                           |
| `ui.expense.you.get`                          | `expense_participant.gets`, `balance_list.gets`                                                                                     |
| `ui.expense.user.get`                         | `expense_participant.gets`, `balance_list.gets`                                                                                     |
| `ui.expense.you.lent`                         | `expense_details.balance_list.lent`, `ui.expense.statements.you_lent*`                                                              |
| `ui.expense.user.lent`                        | `expense_details.balance_list.lent` (`actor`)                                                                                       |
| `ui.expense.you.owe`                          | `expense_details.balance_list.owes`, `expense_participant.owes`, `balance_summary.you_owe_friend`, `ui.expense.statements.you_owe*` |
| `ui.expense.user.owe`                         | `expense_details.balance_list.owes`, `expense_participant.owes`, `balance_summary.friend_owes_you`                                  |
| `ui.expense.you.pay`                          | `balance_list.pays`, `ui.transfer`, `ui.expense.statements.you_pay_user`                                                            |
| `ui.expense.user.pay`                         | `balance_list.pays`, `ui.transfer`, `ui.expense.statements.user_pays_you`, `ui.expense.statements.user_pays_user`                   |
| `ui.expense.you.paid`                         | `expense_participant.paid`                                                                                                          |
| `ui.expense.user.paid`                        | `expense_participant.paid`                                                                                                          |
| `ui.expense.you.received`                     | `expense_participant.received`                                                                                                      |
| `ui.expense.user.received`                    | `expense_participant.received`                                                                                                      |

## Namespace `home`

| Obsolete key          | Replacement                   |
| --------------------- | ----------------------------- |
| `hero.title_part1`    | `hero.title_before_highlight` |
| `hero.subtitle_part1` | `hero.subtitle`               |
| `hero.subtitle_link`  | `hero.subtitle`               |
| `hero.subtitle_part2` | `hero.subtitle`               |

## Keep

All keys not listed above remain unchanged, including `actors.you`,
`ui.expense.{paid_by,received_by,from,to}`,
`ui.and`, `ui.on`, `account.messages.submit_*`, `errors.invalid_split`,
`errors.request_error`, and `errors.subscribe_error`.

## Translation notes

- Restored keys use English fallback until translated.
- Keep `errors.signin_error`; it now requires `{error}`.
- Use `{name}` for interpolation. Nested ICU braces such as
  `other {{person} owes}` are valid; do not replace them globally.
- Participant messages must include `<person/>` and `<amount/>` once per branch.
  They render the existing clickable user and styled amount components.
