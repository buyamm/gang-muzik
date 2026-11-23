import { useLocation } from "react-router";
import { Music2 } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { AppFrame } from "@/components/AppFrame";
import { useSeo } from "@/lib/seo";
import { notFoundSeo } from "@shared/seo";

export function NotFound({ message = "Không tìm thấy trang này." }: { message?: string }) {
  useSeo(notFoundSeo(useLocation().pathname));
  return (
    <AppFrame>
      <Center padding={10} role="main">
        <EmptyState
          headingLevel={1}
          icon={<Icon icon={Music2} size="lg" />}
          title="Lạc nhịp rồi (404)"
          description={message}
          actions={<Button href="/" variant="primary" label="Về thư viện" />}
        />
      </Center>
    </AppFrame>
  );
}
