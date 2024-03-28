/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import Link from 'next/link';
import { Separator } from '~/components/ui/separator';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const config = {
  footer: (
    <div className="mt-20 flex items-center justify-center gap-4">
      <Link href="https://splitpro.app/balances" target="_blank">
        App
      </Link>
      <Separator orientation="vertical" className="h-5" />
      <Link href="https://github.com/oss-apps/split-pro" target="_blank">
        Github
      </Link>
      <Separator orientation="vertical" className="h-5" />
      <Link href="https://www.producthunt.com/products/splitpro/reviews/new" target="_blank">
        Product Hunt
      </Link>
    </div>
  ),
  // @ts-expect-error
  head: ({ title, meta }) => (
    <>
      {meta.description && <meta name="description" content={title} />}
      {meta.tag && <meta name="keywords" content={meta.tag} />}
      {meta.author && <meta name="author" content={meta.author} />}
    </>
  ),
  readMore: 'Read More →',
  postFooter: null,
};

export default config;
