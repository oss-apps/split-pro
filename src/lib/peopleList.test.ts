import { peopleListEmptyReason } from '~/lib/peopleList';

describe('peopleListEmptyReason', () => {
  it('should say nothing while contacts are still loading', () => {
    expect(
      peopleListEmptyReason({ isLoading: true, hasAnyContacts: false, isFiltering: false }),
    ).toBeNull();
  });

  it('should stay silent while loading even once a filter is typed', () => {
    expect(
      peopleListEmptyReason({ isLoading: true, hasAnyContacts: true, isFiltering: true }),
    ).toBeNull();
  });

  it('should report having no contacts at all', () => {
    expect(
      peopleListEmptyReason({ isLoading: false, hasAnyContacts: false, isFiltering: false }),
    ).toBe('no_contacts');
  });

  it('should report having no contacts even when a filter is typed', () => {
    // The filter is irrelevant: there was never anything to match against.
    expect(
      peopleListEmptyReason({ isLoading: false, hasAnyContacts: false, isFiltering: true }),
    ).toBe('no_contacts');
  });

  it('should report that the filter matched nobody', () => {
    expect(
      peopleListEmptyReason({ isLoading: false, hasAnyContacts: true, isFiltering: true }),
    ).toBe('no_matches');
  });

  it('should report that everyone has already been added', () => {
    expect(
      peopleListEmptyReason({ isLoading: false, hasAnyContacts: true, isFiltering: false }),
    ).toBe('all_added');
  });
});
