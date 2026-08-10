import { Badge } from "@/components/ui/badge";
import { STAGE_COLORS, type Stage } from "@/lib/constants";

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge
      className="text-white"
      style={{ background: STAGE_COLORS[stage] }}
    >
      {stage}
    </Badge>
  );
}
