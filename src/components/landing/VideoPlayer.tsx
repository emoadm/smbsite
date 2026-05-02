/**
 * Conditional <video> stub for the hero (D-03 + D-08, UI-SPEC §6.1).
 *
 * Returns null when no `src` prop is provided so {@link Hero} falls back to
 * the still image. When a Bunny Stream URL (or any video URL) is passed in,
 * renders a native HTML5 `<video>` element with controls always visible and
 * playback strictly user-initiated.
 *
 * D-08 mandates a formal-respectful tone: the player must NOT auto-play, loop,
 * or render muted. We render only `controls` and `preload="metadata"` so the
 * visitor sees a poster + play button until they choose to engage.
 */
export function VideoPlayer({
  src,
  poster,
}: {
  src?: string;
  poster?: string;
}) {
  if (!src) return null;
  return (
    <video
      src={src}
      poster={poster}
      controls
      preload="metadata"
      className="absolute inset-0 -z-20 h-full w-full object-cover"
    />
  );
}
