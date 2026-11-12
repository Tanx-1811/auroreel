<p align="center">
  <img src="brand/social/readme-banner-1600x500.png" alt="Auroreel — giao diện, ánh sáng nền và chế độ rạp cho web xem phim" width="800">
</p>

<h1 align="center">Auroreel</h1>
<p align="center"><b>Giao diện đẹp, ánh sáng nền & chế độ rạp cho YouTube, Twitch, Netflix, FPT Play, VieON…</b><br>
<i>Themes, ambient light, cinema mode & player tools for video sites — a Chrome extension.</i></p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-8b5cf6">
  <img alt="Tiếng Việt · English" src="https://img.shields.io/badge/ng%C3%B4n%20ng%E1%BB%AF-Ti%E1%BA%BFng%20Vi%E1%BB%87t%20%C2%B7%20English-d946ef">
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-f97316">
</p>

Auroreel biến các trang xem video thành rạp phim của riêng bạn: chọn một trong 24 chủ đề (hoặc tự tạo, kể cả từ
một bức ảnh hay từ chính video đang xem), để màu của video toả sáng quanh khung hình, làm tối cả trang chỉ chừa lại
video, và có thêm bộ công cụ trình phát mà các trang không có sẵn. Không tài khoản, không theo dõi — mọi thứ nằm trên
máy bạn.

## Tính năng

|                                 |                                                                                                                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🎨 **24 chủ đề**                | Tối và sáng; nền cực quang, chuyển màu hoặc ảnh riêng; thanh trên và menu hiệu ứng kính; bo góc; phông Be Vietnam Pro / Lexend / Nunito. Tìm kiếm, ♥ yêu thích.                                                                           |
| 🖌️ **Tạo chủ đề**               | 6 màu, xem trước trực tiếp, kiểm tra độ dễ đọc; bắt đầu từ một màu, từ ảnh (tự lấy bảng màu) hoặc ngẫu nhiên. **Lấy màu từ video đang xem** chỉ với một nút. Xuất/nhập file chủ đề.                                                       |
| 🌈 **Đổi màu sâu**              | Đọc chính bảng màu của trang (YouTube, Twitch) và cả màu viết cứng (Netflix, FPT Play, VieON, Prime Video…) nên mọi góc đều theo chủ đề.                                                                                                  |
| ✨ **Ánh sáng nền**             | Màu của video toả sáng dịu quanh khung hình.                                                                                                                                                                                              |
| 🌙 **Chế độ rạp**               | Làm tối mọi thứ trừ video; có thể tự bật khi video phát.                                                                                                                                                                                  |
| 🎛️ **Thanh công cụ trên video** | Tốc độ 0,1×–16×, bộ lọc màu hình (8 kiểu), tăng âm lượng tới 300%, lặp, lặp đoạn A–B, chụp khung hình, hình trong hình, lấy màu video. Tự chọn nút và cỡ thanh.                                                                           |
| 🐱 **Thanh tiến độ sinh động**  | Nút kéo trên YouTube thành trái tim, ngôi sao, tên lửa, mèo, hoa sen… (16 hình), emoji bất kỳ hoặc ảnh của bạn; nảy, xoay, nhịp, lắc khi video phát; màu phần đã xem (cầu vồng…), độ dày; thanh mảnh luôn hiện khi YouTube ẩn điều khiển. |
| ⏲️ **Hẹn giờ tắt**              | Tự dừng sau 15/30/60 phút hoặc khi hết video — chặn luôn video tự phát tiếp theo.                                                                                                                                                         |
| 💬 **Phụ đề**                   | Cỡ chữ, màu, nền sau chữ, chữ đậm — YouTube, Netflix, Prime Video, Disney+ và trình phát chuẩn.                                                                                                                                           |
| 🧘 **YouTube gọn gàng**         | Ẩn Shorts, bảng tin trang chủ, video liên quan, bình luận, màn hình kết thúc…; số video mỗi hàng; làm mờ video đã xem; **chất lượng mặc định** (480p–4K).                                                                                 |
| 🌗 **Tự đổi theo giờ**          | Ban ngày chủ đề sáng, ban đêm chủ đề tối — theo giờ hoặc theo hệ thống.                                                                                                                                                                   |
| ☁️ **Đồng bộ & sao lưu**        | Đồng bộ qua tài khoản Chrome (tuỳ chọn), xuất/nhập toàn bộ ra file.                                                                                                                                                                       |

## Trang được hỗ trợ

| Mức                    | Trang                                                         | Có gì                                                                      |
| ---------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Đầy đủ**             | YouTube, Twitch                                               | Đổi mọi màu, nền phía sau trang, tuỳ chọn bố cục, mọi công cụ trình phát   |
| **Đổi màu**            | Netflix, Prime Video, Disney+, YouTube Music, FPT Play, VieON | Mọi màu theo chủ đề (giữ phong cách tối của trang), mọi công cụ trình phát |
| **Cơ bản**             | Vimeo                                                         | Màu nền, màu nhấn, phông chữ, mọi công cụ trình phát                       |
| **Công cụ trình phát** | Mọi trang có video khác                                       | Bật trong Studio → Trang web → "Cho phép trên mọi trang"                   |

## Cài đặt

**Từ Chrome Web Store:** sắp có.

**Cài thử từ mã nguồn** (Chrome, Edge, Brave, Cốc Cốc…):

```bash
git clone https://github.com/Tanx-1811/auroreel.git && cd auroreel
npm install && npm run build
```

Mở `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn thư mục `dist/`. Ghim Auroreel lên
thanh công cụ (biểu tượng mảnh ghép → ghim) để đổi chủ đề bằng một cú bấm.

## Cách dùng

1. **Chọn chủ đề:** bấm biểu tượng Auroreel → tab **Chủ đề** → bấm một thẻ. Mọi tab đang mở đổi ngay, không cần tải
   lại. Bật **Chỉ cho YouTube** (hoặc trang đang mở) để mỗi trang một phong cách. Bấm ♥ để đưa chủ đề lên đầu.
2. **Tự tạo chủ đề:** **Mở Studio** → **Tạo chủ đề**. Chọn "Từ một bức ảnh" để lấy màu từ ảnh và dùng ảnh làm nền,
   hoặc khi đang xem video bấm nút 🎨 trên thanh công cụ (hay `Alt + V`) để lấy màu từ khung hình hiện tại.
3. **Công cụ trên video:** rê chuột lên video, thanh công cụ hiện ở góc. Nút bộ lọc mở bảng màu hình và tăng âm lượng.
4. **Hẹn giờ tắt, lặp A–B, chế độ rạp:** popup → tab **Trình phát** → các nút nhanh phía trên.
5. **Tuỳ chỉnh từng trang:** popup → tab **Bố cục** (ẩn Shorts, chất lượng mặc định…), hoặc Studio → **Trang web**.
6. **Trang trí thanh tiến độ:** Studio → **Trang trí** → chọn nút kéo (hoặc gõ một emoji, tải ảnh), chuyển động, màu và
   độ dày — khung xem trước chạy thử ngay; bật **Luôn hiện tiến độ** để luôn thấy video đã xem tới đâu. Trên YouTube,
   popup → tab **Bố cục** cũng chọn nhanh được. Cùng trang này: kiểu thanh cuộn, nút và cỡ thanh công cụ.
7. **Tạm tắt** giao diện ở một tab: `Alt + T`. Tắt hẳn: công tắc ở góc popup.

### Phím tắt (đổi được trong Studio → Phím tắt)

| Phím            | Việc                             | Phím              | Việc                          |
| --------------- | -------------------------------- | ----------------- | ----------------------------- |
| `S` / `D` / `R` | Chậm / nhanh / tốc độ thường     | `Z` / `X`         | Lùi / tới 10 giây             |
| `[` / `]` / `\` | Lặp A–B: đặt đầu / đặt cuối / bỏ | `Alt + C`         | Chế độ rạp                    |
| `Alt + A`       | Ánh sáng nền                     | `Alt + F`         | Bật/tắt bộ lọc màu hình       |
| `Alt + S`       | Lưu khung hình                   | `Alt + P`         | Hình trong hình               |
| `Alt + L`       | Lặp video                        | `Alt + V`         | Lấy màu từ video thành chủ đề |
| `Alt + T`       | Tạm tắt giao diện ở tab này      | `Alt + Shift + R` | Mở Auroreel                   |

Phím tắt không chạy khi bạn đang gõ chữ.

## Quyền riêng tư

Không tài khoản, không phân tích, không máy chủ. Cài đặt, chủ đề và ảnh nằm trong bộ nhớ của tiện ích trên máy bạn;
đồng bộ qua Chrome chỉ khi bạn bật. Auroreel chỉ chạy trên các trang được hỗ trợ (cộng CDN CSS của VieON để đọc màu);
"mọi trang khác" là quyền tuỳ chọn. Chi tiết: [docs/PRIVACY.md](docs/PRIVACY.md).

## Phát triển

```bash
npm run dev            # build lại khi sửa code → dist/
npm test               # unit test (Vitest)
npx playwright install chromium   # một lần
npm run test:e2e       # end-to-end + trợ năng (Chrome for Testing, trang thử nghiệm cục bộ)
npm run test:live      # kiểm tra trên YouTube, Twitch, Netflix, FPT Play, VieON, Prime Video thật (cần mạng)
npm run lint && npm run format:check && npm run typecheck
npm run package        # → release/auroreel-<phiên bản>.zip để nộp Chrome Web Store
npm run brand          # logo, ảnh quảng bá → brand/
npm run screenshots    # ảnh chụp Store (EN/VI) → brand/store/screenshots/
```

Kiến trúc: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Nộp Store: [docs/PUBLISHING.md](docs/PUBLISHING.md) ·
Đóng góp: [CONTRIBUTING.md](CONTRIBUTING.md) · Bảo mật: [SECURITY.md](SECURITY.md) · Giấy phép: [MIT](LICENSE).

---

## English

**Auroreel — themes, ambient light & cinema mode for video sites.** 24 themes (or your own, made from a colour, a
picture or the video you're watching), a recolouring engine that follows each site's own palette, ambient light,
cinema mode, a floating player toolbar (speed, picture filters, volume boost up to 300 %, A–B loop, frame capture,
picture in picture — pick its buttons and size), a lively YouTube progress bar (16 drawn knobs, any emoji or your own
picture, with motion, colours and an always-on thin bar), scrollbar styles, a sleep timer, subtitle styling, a tidier YouTube (hide Shorts and more, default quality) and
optional Chrome Sync. Full support on YouTube and Twitch; every colour recoloured on Netflix, Prime Video, Disney+,
YouTube Music, FPT Play and VieON; player tools anywhere once allowed. No account, no tracking, no server.

Install from source: `npm install && npm run build`, then load `dist/` unpacked in `chrome://extensions`.

Auroreel is an independent project, not affiliated with YouTube, Google, Twitch, Netflix, Amazon, Disney, Vimeo,
FPT Play or VieON.
