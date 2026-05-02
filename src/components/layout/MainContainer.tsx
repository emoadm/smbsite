import { cn } from '@/lib/utils';

type Width = 'form' | 'legal' | 'prose' | 'page' | 'wide';

const WIDTH_CLASSES: Record<Width, string> = {
  form: 'max-w-[480px]',
  legal: 'max-w-[720px]',
  prose: 'max-w-[768px]',
  page: 'max-w-[1140px]',
  wide: 'max-w-[1280px]',
};

export function MainContainer({
  width = 'form',
  className,
  children,
}: {
  width?: Width;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-12 md:px-6 md:py-16',
        WIDTH_CLASSES[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
