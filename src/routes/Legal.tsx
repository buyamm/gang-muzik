import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const UPDATED = "10/11/2026";
const CONTACT = "https://github.com/buyamm/gang-muzik/issues";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <title>{`${title} · Gang Muzik`}</title>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Về thư viện">
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="flex-1 font-display text-3xl font-bold">{title}</h1>
          <ThemeToggle />
        </div>
        <p className="mb-6 text-sm text-muted-foreground">Cập nhật lần cuối: {UPDATED}</p>
        <div className="space-y-6 leading-relaxed [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
}

const ContactLink = () => (
  <a href={CONTACT} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
    trang GitHub của dự án
  </a>
);

export function Privacy() {
  return (
    <Shell title="Chính sách quyền riêng tư">
      <p>
        Gang Muzik gồm <b>thư viện công khai</b> (xem sheet nhạc, cảm âm, hợp âm, tab) và <b>Studio</b> (nơi đăng nhập để đóng góp bài).
        Trang này giải thích chúng tôi thu thập gì và dùng vào việc gì.
      </p>
      <section>
        <h2>1. Thư viện công khai</h2>
        <ul>
          <li>Không cần tài khoản, không đặt cookie theo dõi, không quảng cáo, không công cụ phân tích hành vi.</li>
          <li>
            Cài đặt khi xem (tốc độ, cỡ chữ, chế độ xem, phím pedal, giao diện sáng/tối) chỉ lưu trong trình duyệt của bạn
            (localStorage) và không gửi về máy chủ.
          </li>
          <li>Bài bạn đã mở có thể được lưu tạm trong trình duyệt để xem lại khi mạng yếu.</li>
        </ul>
      </section>
      <section>
        <h2>2. Studio — khi bạn đăng nhập bằng Google</h2>
        <ul>
          <li>
            Chúng tôi chỉ nhận từ Google: <b>tên, địa chỉ email, ảnh đại diện</b> và mã định danh tài khoản Google. Chúng tôi không truy cập
            Gmail, Drive, danh bạ hay bất kỳ dữ liệu Google nào khác.
          </li>
          <li>
            Dùng để: đăng nhập, ghi nhận người đăng bài, hiển thị cho quản trị viên khi duyệt bài, và chống lạm dụng (giới hạn số bài / lượt tải ảnh).
          </li>
          <li>
            Phiên đăng nhập dùng một cookie bảo mật (HttpOnly) cần thiết để giữ bạn đăng nhập; máy chủ chỉ lưu bản băm của mã phiên.
          </li>
          <li>Email của bạn chỉ quản trị viên nhìn thấy, không hiển thị trên thư viện công khai.</li>
        </ul>
      </section>
      <section>
        <h2>3. Nội dung bạn đăng</h2>
        <ul>
          <li>Bài và ảnh bạn tải lên được lưu trên hạ tầng Cloudflare (D1, R2).</li>
          <li>Bài chưa duyệt chỉ bạn và quản trị viên xem được. Bài đã duyệt hiển thị công khai trên thư viện.</li>
        </ul>
      </section>
      <section>
        <h2>4. Chia sẻ dữ liệu</h2>
        <p>
          Chúng tôi không bán, không cho thuê và không chia sẻ dữ liệu cá nhân của bạn cho bên thứ ba. Dữ liệu được xử lý bởi các nhà cung
          cấp hạ tầng cần thiết để vận hành dịch vụ: Cloudflare (lưu trữ, máy chủ — có thể ghi nhật ký kỹ thuật như địa chỉ IP để bảo mật) và
          Google (đăng nhập).
        </p>
      </section>
      <section>
        <h2>5. Quyền của bạn</h2>
        <p>
          Bạn có thể tự xoá bài chưa duyệt của mình trong Studio. Để xoá tài khoản hoặc toàn bộ dữ liệu của bạn, hãy liên hệ quản trị viên qua{" "}
          <ContactLink />. Bạn cũng có thể gỡ quyền truy cập của Gang Muzik bất cứ lúc nào tại trang quản lý tài khoản Google.
        </p>
      </section>
      <section>
        <h2>6. Thay đổi</h2>
        <p>Nếu chính sách thay đổi, chúng tôi sẽ cập nhật trang này và ngày “Cập nhật lần cuối” ở trên.</p>
      </section>
    </Shell>
  );
}

export function Terms() {
  return (
    <Shell title="Điều khoản sử dụng">
      <section>
        <h2>1. Dịch vụ</h2>
        <p>
          Gang Muzik là dự án cá nhân, miễn phí, giúp người chơi nhạc xem sheet / cảm âm / hợp âm / tab rảnh tay. Dịch vụ được cung cấp “như
          hiện có”, không cam kết luôn sẵn sàng hay không có lỗi.
        </p>
      </section>
      <section>
        <h2>2. Nội dung bạn đóng góp</h2>
        <ul>
          <li>Chỉ đăng nội dung bạn tự soạn hoặc có quyền chia sẻ. Tôn trọng bản quyền của tác giả và nhà xuất bản.</li>
          <li>Không đăng nội dung vi phạm pháp luật, xúc phạm, quảng cáo, spam hoặc mã độc.</li>
          <li>
            Khi gửi bài, bạn cho phép Gang Muzik lưu trữ và hiển thị công khai bài đó (sau khi được duyệt). Bạn vẫn giữ mọi quyền với nội
            dung của mình.
          </li>
        </ul>
      </section>
      <section>
        <h2>3. Quyền của quản trị viên</h2>
        <p>
          Quản trị viên có quyền duyệt, từ chối, chỉnh sửa, gỡ bất kỳ bài nào, và khoá tài khoản vi phạm điều khoản mà không cần báo trước.
        </p>
      </section>
      <section>
        <h2>4. Bản quyền & khiếu nại</h2>
        <p>
          Nếu bạn là chủ sở hữu bản quyền và thấy nội dung của mình bị đăng không được phép, hãy liên hệ qua <ContactLink /> — chúng tôi sẽ gỡ
          sớm nhất có thể.
        </p>
      </section>
      <section>
        <h2>5. Quyền riêng tư</h2>
        <p>
          Xem{" "}
          <Link to="/privacy" className="text-primary underline underline-offset-4">
            Chính sách quyền riêng tư
          </Link>
          .
        </p>
      </section>
    </Shell>
  );
}
