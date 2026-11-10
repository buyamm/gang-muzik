import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/hooks/useAdmin";

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const { login } = useAdmin();
  const [pin, setPin] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate(pin, {
          onSuccess: () => {
            toast.success("Đã đăng nhập quản trị");
            setPin("");
            onSuccess?.();
          },
          onError: (err) => toast.error(err.message),
        });
      }}
    >
      <Input
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        placeholder="Mã PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        autoFocus
      />
      <Button type="submit" className="w-full" disabled={!pin || login.isPending}>
        {login.isPending ? "Đang kiểm tra…" : "Đăng nhập"}
      </Button>
    </form>
  );
}

export function LoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Đăng nhập quản trị</DialogTitle>
          <DialogDescription>Nhập mã PIN để thêm, sửa, xoá bài.</DialogDescription>
        </DialogHeader>
        <LoginForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
