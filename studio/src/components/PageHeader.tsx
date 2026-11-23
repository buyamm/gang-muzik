import type { ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { Text } from "@astryxdesign/core/Text";

/** Studio page title row: heading + optional description, actions on the right */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <Heading level={1}>{title}</Heading>
        {description && (
          <Text color="secondary" as="p">
            {description}
          </Text>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

/** loading / error placeholder for a query-backed list */
export function QueryFallback({ error }: { error?: Error | null }) {
  if (error) return <Banner status="error" title="Không tải được dữ liệu" description={error.message} />;
  return (
    <div className="h-40">
      <Skeleton radius={4} />
    </div>
  );
}
