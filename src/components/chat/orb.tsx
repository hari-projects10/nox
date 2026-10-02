import { cn } from "@/lib/utils";

/**
 * The assistant's face: a pearl of the site's aurora palette, slowly
 * swirling. While a reply is on its way it breathes and a faster
 * counter-swirl fades in (styles under "Assistant" in globals.css).
 */
export function Orb({
  size,
  thinking = false,
  className,
}: {
  size: number;
  thinking?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-state={thinking ? "thinking" : "idle"}
      className={cn("chat-orb", className)}
      style={{ width: size, height: size, fontSize: size }}
    >
      <span className="chat-orb-swirl" />
      <span className="chat-orb-swirl" data-fast="" />
      <span className="chat-orb-gloss" />
    </span>
  );
}
