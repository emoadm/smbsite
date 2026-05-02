import type { MetadataRoute } from 'next';

const BASE = 'https://chastnik.eu';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/agenda', '/faq', '/legal/'],
        disallow: ['/member', '/admin', '/auth/', '/api/', '/login', '/register'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
