import type { MetadataRoute } from 'next';

const BASE = 'https://chastnik.eu';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`,              lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/agenda`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/faq`,           lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/legal/privacy`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/legal/terms`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/register`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.6 },
    // /member, /login, /auth/* are NOT in sitemap (not for search indexing)
  ];
}
