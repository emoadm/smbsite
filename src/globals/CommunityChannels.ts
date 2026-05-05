import type { GlobalConfig } from 'payload';

/**
 * Phase 5 D-12 — single-row Global storing WhatsApp + Telegram channel URLs.
 *
 * Coalition delivers URLs post-deploy via /admin/globals/community-channels
 * (no redeploy). Pre-D-CoalitionChannels-resolution, *Visible flags default
 * to false and the /community page (Plan 05-09) renders the
 * "Каналите стартират скоро" placeholder per UI-SPEC §5.2.3.
 *
 * Access (UI-SPEC §5.2):
 *   - read: public (RSC consumes per-request to render auth-conditional UI)
 *   - update: editor/admin only (D-25)
 *
 * Why a Global, not a Collection? One row per environment; multi-row would
 * leak ambiguity. Payload Globals have first-class admin UI at
 * /admin/globals/community-channels.
 */

const isEditorOrAdmin = ({ req }: { req: { user?: unknown } }): boolean => {
  const role = ((req.user as { role?: string } | null)?.role) ?? '';
  return ['admin', 'editor'].includes(role);
};

export const CommunityChannels: GlobalConfig = {
  slug: 'community-channels',
  admin: {
    description: 'Канали за общността (WhatsApp + Telegram)',
  },
  access: {
    read: () => true,
    update: isEditorOrAdmin,
  },
  fields: [
    {
      name: 'whatsappChannelUrl',
      type: 'text',
      admin: { description: 'WhatsApp Channel URL (https://whatsapp.com/channel/...)' },
    },
    {
      name: 'whatsappVisible',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Активирай показването на WhatsApp линка' },
    },
    {
      name: 'telegramChannelUrl',
      type: 'text',
      admin: { description: 'Telegram channel URL (https://t.me/...)' },
    },
    {
      name: 'telegramVisible',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Активирай показването на Telegram линка' },
    },
    {
      name: 'bgDescription',
      type: 'textarea',
      admin: { description: 'Описание за /community страницата (community.explainer.body)' },
    },
  ],
};
