export type PeopleListEmptyReason = 'no_contacts' | 'no_matches' | 'all_added';

export interface PeopleListEmptyOptions {
  isLoading: boolean;
  /** Whether the user has any contacts at all, before the search box filters them. */
  hasAnyContacts: boolean;
  /** Whether the search box currently narrows the list. */
  isFiltering: boolean;
}

/**
 * Explains why a list of people came out empty, so the UI can say something true rather
 * than rendering nothing.
 *
 * Returns null while the contacts are still loading: showing "you have not shared expenses
 * with anyone" before the query resolves would be the same misleading blank in a new form.
 */
export const peopleListEmptyReason = ({
  isLoading,
  hasAnyContacts,
  isFiltering,
}: PeopleListEmptyOptions): PeopleListEmptyReason | null => {
  if (isLoading) {
    return null;
  }

  if (!hasAnyContacts) {
    return 'no_contacts';
  }

  return isFiltering ? 'no_matches' : 'all_added';
};
