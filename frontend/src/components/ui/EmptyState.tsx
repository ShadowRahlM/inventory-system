import { PackageOpen } from "lucide-react";

export function EmptyState({
  title = "No data found",
  description = "There are no items to display yet.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      <PackageOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
      <h3 className="mb-1 text-lg font-medium">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
