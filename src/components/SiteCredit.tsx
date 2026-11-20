import { CREATOR_NAME, CREATOR_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

const FIRST_YEAR = 2026;

/** Copyright line with the site creator, shared by the public site and Studio footers */
export function SiteCredit({ className }: { className?: string }) {
  const year = new Date().getFullYear();
  const years = year > FIRST_YEAR ? `${FIRST_YEAR}–${year}` : `${FIRST_YEAR}`;
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      © {years} Gang Muzik. Làm bởi{" "}
      <a
        href={CREATOR_URL}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        {CREATOR_NAME}
      </a>
      .
    </p>
  );
}
