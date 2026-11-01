import { type ListCursor, collectPages } from './pagination';

describe('full-history pagination for exports', () => {
  it('collects every page without requiring the user to scroll first', async () => {
    const cursor: ListCursor = { date: new Date(), id: '00000000-0000-4000-8000-000000000001' };
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce({ items: ['newest'], nextCursor: cursor })
      .mockResolvedValueOnce({ items: ['oldest'] });
    expect(await collectPages(fetchPage)).toEqual(['newest', 'oldest']);
    expect(fetchPage.mock.calls).toEqual([[undefined], [cursor]]);
  });

  it('propagates page failures so exports cannot silently download a partial history', async () => {
    const fetchPage = jest.fn().mockRejectedValue(new Error('Network unavailable'));
    await expect(collectPages(fetchPage)).rejects.toThrow('Network unavailable');
  });
});
