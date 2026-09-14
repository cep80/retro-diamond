import { isPitcher } from "@/game/data";
import { spotlightForPlayer, type SpotlightPlayer } from "@/game/presentation";
import type { Player, Team } from "@/game/types";
import { cn } from "@/lib/utils";

export function PlayerAvatar({
  player,
  team,
  spotlight: suppliedSpotlight,
  className,
}: {
  player: Player;
  team?: Team;
  spotlight?: SpotlightPlayer | null;
  className?: string;
}) {
  const spotlight = suppliedSpotlight ?? (team ? spotlightForPlayer(team, player.id) : null);
  const arm = isPitcher(player.pos);
  const flip = arm ? player.throws === "L" : player.bats === "L";

  return (
    <div
      className={cn(
        "player-avatar relative size-12 shrink-0 overflow-hidden rounded-xl border border-line bg-ink",
        spotlight && "player-avatar-featured",
        className,
      )}
      style={{ ["--avatar-accent" as string]: team?.color2 ?? "var(--color-grass-2)" }}
      aria-hidden="true"
    >
      {spotlight ? (
        <img
          src={spotlight.portrait}
          alt=""
          className="pointer-events-none absolute inset-x-[-22%] bottom-[-29%] h-[142%] w-[142%] max-w-none object-contain"
          crossOrigin="anonymous"
        />
      ) : (
        <img
          src={arm ? "/sprites/pitcher.png" : "/sprites/batter-idle.png"}
          alt=""
          className="pointer-events-none absolute -left-[6%] -top-[10%] h-[200%] w-[200%] max-w-none"
          style={{
            imageRendering: "pixelated",
            transform: flip ? "scaleX(-1)" : undefined,
          }}
          crossOrigin="anonymous"
        />
      )}
      <span className="absolute bottom-0 left-0 z-10 rounded-tr-md bg-ink/85 px-1 py-0.5 font-display text-[8px] text-grass-2">
        {player.pos}
      </span>
    </div>
  );
}
