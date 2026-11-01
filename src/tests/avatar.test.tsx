/** @jest-environment node */

import { renderToStaticMarkup } from 'react-dom/server';

import { EntityAvatar } from '~/components/ui/avatar';

let mockDeletedLabel = 'Deleted user';
jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: () => mockDeletedLabel }),
}));

const deletedUser = (id: number) => ({ id, name: 'Deleted user', deletedAt: new Date() });
const avatarMarkup = (html: string) => {
  const svg = /<svg[\s\S]*?<\/svg>/.exec(html)?.[0];
  expect(svg).toBeDefined();
  return svg?.replace(/aria-label="[^"]*"/, '');
};

describe('deleted-user avatars', () => {
  beforeEach(() => {
    mockDeletedLabel = 'Deleted user';
  });

  it('gives different deleted accounts distinct avatars with the same accessible label', () => {
    const first = renderToStaticMarkup(<EntityAvatar entity={deletedUser(1)} />);
    const second = renderToStaticMarkup(<EntityAvatar entity={deletedUser(2)} />);
    expect(first).toContain('aria-label="Deleted user"');
    expect(second).toContain('aria-label="Deleted user"');
    expect(avatarMarkup(first)).not.toBe(avatarMarkup(second));
  });

  it('keeps the same avatar when the translated accessible label changes', () => {
    const entity = deletedUser(1);
    const english = renderToStaticMarkup(<EntityAvatar entity={entity} />);
    mockDeletedLabel = 'Utilisateur supprimé';
    const french = renderToStaticMarkup(<EntityAvatar entity={entity} />);
    expect(french).toContain('aria-label="Utilisateur supprimé"');
    expect(avatarMarkup(french)).toBe(avatarMarkup(english));
  });

  it('preserves name-based avatars for active users', () => {
    const first = renderToStaticMarkup(<EntityAvatar entity={{ id: 1, name: 'Alex' }} />);
    const second = renderToStaticMarkup(<EntityAvatar entity={{ id: 2, name: 'Alex' }} />);
    expect(first).toContain('aria-label="Alex"');
    expect(avatarMarkup(first)).toBe(avatarMarkup(second));
  });
});
