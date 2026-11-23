import type { SongStatus } from "@shared/types";
import { STATUS_LABEL } from "@shared/permissions";
import { Badge, type BadgeProps } from "@astryxdesign/core/Badge";

const VARIANT: Record<SongStatus, BadgeProps["variant"]> = {
  draft: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "error",
};

export function StatusBadge({ status }: { status: SongStatus }) {
  return <Badge variant={VARIANT[status]} label={STATUS_LABEL[status]} />;
}
