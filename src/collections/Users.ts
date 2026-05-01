import type { CollectionConfig } from 'payload';

// Slug renamed from `users` to `admin_users` to avoid table-name collision
// with the Drizzle Auth.js `users` table from plan 01-03 (D-25 — Payload is
// the editorial admin, not the member auth surface). Plan 01-04 deferred
// the live migrate that would have caught this; surfaced during 01-12 deploy.
// Admin UI path becomes /admin/collections/admin-users (was /admin/collections/users).
export const Users: CollectionConfig = {
  slug: 'admin_users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
    },
  ],
};
