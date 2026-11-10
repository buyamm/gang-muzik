import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NotFound({ message = "Không tìm thấy trang này." }: { message?: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline">
        <Link to="/">Về thư viện</Link>
      </Button>
    </div>
  );
}
