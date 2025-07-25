import { type GetServerSideProps } from 'next';

import { env } from '~/env';

const getSitemapXml = (url: string) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
<!-- created with Free Online Sitemap Generator www.xml-sitemaps.com -->


<url>
  <loc>${url}/home</loc>
  <lastmod>2025-07-25T08:31:47+00:00</lastmod>
  <priority>1.00</priority>
</url>
<url>
  <loc>${url}/blog/need-for-splitwise-alternative</loc>
  <lastmod>2025-07-25T08:31:47+00:00</lastmod>
  <priority>0.80</priority>
</url>
<url>
  <loc>${url}/terms</loc>
  <lastmod>2025-07-25T08:31:47+00:00</lastmod>
  <priority>0.80</priority>
</url>
<url>
  <loc>${url}/privacy</loc>
  <lastmod>2025-07-25T08:31:47+00:00</lastmod>
  <priority>0.80</priority>
</url>
<url>
  <loc>${url}/auth/signin</loc>
  <lastmod>2025-07-25T08:31:47+00:00</lastmod>
  <priority>0.80</priority>
</url>


</urlset>`;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Generate the XML sitemap with the blog data
  const sitemap = getSitemapXml(env.NEXTAUTH_URL);

  res.setHeader('Content-Type', 'text/xml');
  // Send the XML to the browser
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

export default function Sitemap() {
  // This page is only used to generate the sitemap.xml
  return null;
}
