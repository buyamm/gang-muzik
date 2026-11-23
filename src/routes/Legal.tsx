import { Children, isValidElement, type ReactNode } from "react";
import { Link as RouterLinkText } from "@astryxdesign/core/Link";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { Outline } from "@astryxdesign/core/Outline";
import { VStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { AppFrame } from "@/components/AppFrame";
import { useSeo } from "@/lib/seo";
import { LEGAL_SEO } from "@shared/seo";

const UPDATED = "10/11/2026";
const CONTACT = "https://github.com/buyamm/gang-muzik/issues";

interface DocSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

/** one numbered section of a legal article; its title feeds the outline */
function DocSection({ id, title, children }: DocSectionProps) {
  return (
    <VStack gap={2}>
      <Heading level={2} id={id}>
        {title}
      </Heading>
      <div className="space-y-2 leading-relaxed text-muted-foreground [&_b]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </VStack>
  );
}

/** Legal article (Astryx template "documentation-technical"): article + outline panel on wide screens. */
function Shell({ title, page, children }: { title: string; page: keyof typeof LEGAL_SEO; children: ReactNode }) {
  useSeo(LEGAL_SEO[page]);
  const items = Children.toArray(children)
    .filter((c): c is React.ReactElement<DocSectionProps> => isValidElement<DocSectionProps>(c) && c.type === DocSection)
    .map((c) => ({ id: c.props.id, label: c.props.title, level: 2 }));
  return (
    <AppFrame>
      <Layout
        height="auto"
        end={
          <div className="hidden lg:block">
            <LayoutPanel role="complementary" label="Mục lục" padding={8} width={320}>
              <Outline items={items} label="Mục lục" density="compact" />
            </LayoutPanel>
          </div>
        }
        content={
          <LayoutContent padding={8} role="main">
            <div className="max-w-3xl">
              <VStack gap={8}>
                <VStack gap={2}>
                  <Heading level={1}>{title}</Heading>
                  <Text type="supporting" color="secondary">
                    Cập nhật lần cuối: {UPDATED}
                  </Text>
                </VStack>
                {children}
              </VStack>
            </div>
          </LayoutContent>
        }
      />
    </AppFrame>
  );
}

const ContactLink = () => (
  <RouterLinkText href={CONTACT} target="_blank" rel="noreferrer">
    trang GitHub của dự án
  </RouterLinkText>
);

export function Privacy() {
  return (
    <Shell title="Chính sách quyền riêng tư" page="privacy">
      <p>
        Gang Muzik gồm <b>thư viện công khai</b> (xem sheet nhạc, cảm âm, hợp âm, tab) và <b>Studio</b> (nơi đăng nhập để đóng góp bài).
        Trang này giải thích chúng tôi thu thập gì và dùng vào việc gì.
      </p>
      <DocSection id="muc-1" title="1. Thư viện công khai">
        <ul>
          <li>Không cần tài khoản, không đặt cookie theo dõi, không quảng cáo, không công cụ phân tích hành vi.</li>
          <li>
            Cài đặt khi xem (tốc độ, cỡ chữ, chế độ xem, phím pedal, giao diện sáng/tối) chỉ lưu trong trình duyệt của bạn
            (localStorage) và không gửi về máy chủ.
          </li>
          <li>Bài bạn đã mở có thể được lưu tạm trong trình duyệt để xem lại khi mạng yếu.</li>
        </ul>
      </DocSection>
      <DocSection id="muc-2" title="2. Studio — khi bạn đăng nhập bằng Google">
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
      </DocSection>
      <DocSection id="muc-3" title="3. Nội dung bạn đăng">
        <ul>
          <li>Bài và ảnh bạn tải lên được lưu trên hạ tầng Cloudflare (D1, R2).</li>
          <li>Bài chưa duyệt chỉ bạn và quản trị viên xem được. Bài đã duyệt hiển thị công khai trên thư viện.</li>
        </ul>
      </DocSection>
      <DocSection id="muc-4" title="4. Chia sẻ dữ liệu">
        <p>
          Chúng tôi không bán, không cho thuê và không chia sẻ dữ liệu cá nhân của bạn cho bên thứ ba. Dữ liệu được xử lý bởi các nhà cung
          cấp hạ tầng cần thiết để vận hành dịch vụ: Cloudflare (lưu trữ, máy chủ — có thể ghi nhật ký kỹ thuật như địa chỉ IP để bảo mật) và
          Google (đăng nhập).
        </p>
      </DocSection>
      <DocSection id="muc-5" title="5. Quyền của bạn">
        <p>
          Bạn có thể tự xoá bài chưa duyệt của mình trong Studio. Để xoá tài khoản hoặc toàn bộ dữ liệu của bạn, hãy liên hệ quản trị viên qua{" "}
          <ContactLink />. Bạn cũng có thể gỡ quyền truy cập của Gang Muzik bất cứ lúc nào tại trang quản lý tài khoản Google.
        </p>
      </DocSection>
      <DocSection id="muc-6" title="6. Thay đổi">
        <p>Nếu chính sách thay đổi, chúng tôi sẽ cập nhật trang này và ngày “Cập nhật lần cuối” ở trên.</p>
      </DocSection>
    </Shell>
  );
}

export function Terms() {
  return (
    <Shell title="Điều khoản sử dụng" page="terms">
      <DocSection id="muc-1" title="1. Dịch vụ">
        <p>
          Gang Muzik là dự án cá nhân, miễn phí, giúp người chơi nhạc xem sheet / cảm âm / hợp âm / tab rảnh tay. Dịch vụ được cung cấp “như
          hiện có”, không cam kết luôn sẵn sàng hay không có lỗi.
        </p>
      </DocSection>
      <DocSection id="muc-2" title="2. Nội dung bạn đóng góp">
        <ul>
          <li>Chỉ đăng nội dung bạn tự soạn hoặc có quyền chia sẻ. Tôn trọng bản quyền của tác giả và nhà xuất bản.</li>
          <li>Không đăng nội dung vi phạm pháp luật, xúc phạm, quảng cáo, spam hoặc mã độc.</li>
          <li>
            Khi gửi bài, bạn cho phép Gang Muzik lưu trữ và hiển thị công khai bài đó (sau khi được duyệt). Bạn vẫn giữ mọi quyền với nội
            dung của mình.
          </li>
        </ul>
      </DocSection>
      <DocSection id="muc-3" title="3. Quyền của quản trị viên">
        <p>
          Quản trị viên có quyền duyệt, từ chối, chỉnh sửa, gỡ bất kỳ bài nào, và khoá tài khoản vi phạm điều khoản mà không cần báo trước.
        </p>
      </DocSection>
      <DocSection id="muc-4" title="4. Bản quyền & khiếu nại">
        <p>
          Nếu bạn là chủ sở hữu bản quyền và thấy nội dung của mình bị đăng không được phép, hãy liên hệ qua <ContactLink /> — chúng tôi sẽ gỡ
          sớm nhất có thể.
        </p>
      </DocSection>
      <DocSection id="muc-5" title="5. Quyền riêng tư">
        <p>
          Xem{" "}
          <RouterLinkText href="/privacy">Chính sách quyền riêng tư</RouterLinkText>
          .
        </p>
      </DocSection>
    </Shell>
  );
}
