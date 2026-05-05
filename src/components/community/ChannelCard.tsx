import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Phase 5 NOTIF-04 / NOTIF-05 / UI-SPEC §5.2 — channel preview card.
//
// Three variants:
//   - teaser:      anonymous visitor sees card; CTA → /register?next=/community
//                  Background uses bg-surface (subtle "preview" cue).
//   - redeem:      authenticated member sees real external URL; CTA opens in new tab.
//                  Background uses bg-card (active surface).
//   - placeholder: channel not yet activated (D-12 — *Visible flag is false).
//                  Background uses bg-surface; CTA is missing (informational only).
//
// CTA hrefs are passed in by parent — this component NEVER constructs URLs from
// raw user input.
//
// Heading hierarchy: card title is <h3>. The page (/community) renders an h1
// (page title) + a single h2 (explainer); cards sit below the explainer.

export type ChannelCardVariant = 'teaser' | 'redeem' | 'placeholder';

export interface ChannelCardProps {
  variant: ChannelCardVariant;
  icon: ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaExternal?: boolean;
}

export function ChannelCard({
  variant,
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaExternal,
}: ChannelCardProps) {
  const cardClass = variant === 'redeem' ? 'bg-card border' : 'bg-surface';
  return (
    <Card className={cardClass}>
      <CardHeader>
        <div className="text-primary">{icon}</div>
        <h3 className="mt-2 font-display text-xl font-extrabold">{title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-base text-muted-foreground">{description}</p>
        {variant !== 'placeholder' && ctaLabel && ctaHref && (
          <Button asChild className="mt-4" size="lg">
            {ctaExternal ? (
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`channel-cta-${variant}`}
              >
                {ctaLabel}
              </a>
            ) : (
              <Link href={ctaHref} data-testid={`channel-cta-${variant}`}>
                {ctaLabel}
              </Link>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default ChannelCard;
