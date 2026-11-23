import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { CREATOR_NAME, CREATOR_URL, FEEDBACK_URL, PUBLIC_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

const FIRST_YEAR = 2026;

function copyrightYears() {
  const year = new Date().getFullYear();
  return year > FIRST_YEAR ? `${FIRST_YEAR}–${year}` : `${FIRST_YEAR}`;
}

/**
 * One-line legal footer (copyright, creator, legal links, version), shared by the public site and Studio.
 * `base` prefixes the legal links: "" on the public site, PUBLIC_URL from Studio (another origin).
 */
export function CompactFooter({ className, base = PUBLIC_URL }: { className?: string; base?: string }) {
  return (
    <footer className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <Text type="supporting" color="secondary">
        © {copyrightYears()} Gang Muzik · Thiết kế và phát triển bởi{" "}
        <Link href={CREATOR_URL} target="_blank" rel="noreferrer">
          {CREATOR_NAME}
        </Link>
      </Text>
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Text type="supporting">
          <Link href={`${base}/terms`}>Điều khoản</Link>
        </Text>
        <Text type="supporting">
          <Link href={`${base}/privacy`}>Quyền riêng tư</Link>
        </Text>
        <Text type="supporting">
          <Link href={FEEDBACK_URL} target="_blank" rel="noreferrer">
            Góp ý
          </Link>
        </Text>
        <Text type="supporting" color="secondary" hasTabularNumbers>
          v{__APP_VERSION__}
        </Text>
      </span>
    </footer>
  );
}
