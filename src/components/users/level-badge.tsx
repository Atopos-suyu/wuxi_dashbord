import { Badge } from "@/components/ui/badge";
import { LEVEL_COLORS, type Level } from "@/lib/constants";

export function LevelBadge({ level }: { level: Level }) {
  return (
    <Badge
      className="text-white"
      style={{ background: LEVEL_COLORS[level] }}
    >
      {level}
    </Badge>
  );
}
