import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';
import { Users } from './collections/Users';
import { Newsletters } from './collections/Newsletters';      // Phase 5 D-01
import { Pages } from './collections/Pages';                  // Phase 4 EDIT-03
import { Ideas } from './collections/Ideas';                  // Phase 4 EDIT-02
import { CommunityChannels } from './globals/CommunityChannels'; // Phase 5 D-12

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // Phase 2.1 ATTR-07 / D-12 / D-13: custom attribution dashboard view.
    // Payload's importMap auto-resolves the Component path at admin shell init.
    components: {
      views: {
        attribution: {
          Component: '/src/app/(payload)/admin/views/attribution/AttributionView#AttributionView',
          path: '/views/attribution',
        },
        // Phase 4 EDIT-04 / EDIT-05 — editorial moderation queue view.
        moderationQueue: {
          Component: '/src/app/(payload)/admin/views/moderation-queue/ModerationQueueView#ModerationQueueView',
          path: '/views/moderation-queue',
        },
      },
    },
  },
  collections: [Users, Newsletters, Pages, Ideas], // Phase 5 D-01 adds Newsletters; Phase 4 EDIT-03 adds Pages; Phase 4 EDIT-02 adds Ideas
  globals: [CommunityChannels],                // Phase 5 D-12 adds CommunityChannels
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.PAYLOAD_DATABASE_URL || '',
    },
  }),
});
