# Auroreel — Privacy policy / Chính sách quyền riêng tư

_Last updated / Cập nhật: 2026-11-11_

## English

Auroreel is a browser extension that restyles video sites and adds player tools. It works entirely in your browser.

### What Auroreel stores

- Your settings (chosen theme, per-site options, player preferences, shortcuts, language).
- Themes you create, including any picture you choose as a backdrop (resized and stored inside the extension).
- A picture you choose for the progress-bar knob (shrunk to 96 px; stored on this computer only).
- The last playback speed per site, if you turn on "Remember the last speed".
- A cache of the colours a supported site uses, so the next visit is recoloured immediately.

All of this is kept in Chrome's extension storage on this device (`chrome.storage.local`). It is removed when you
uninstall Auroreel or use **Backup → Reset Auroreel**.

**Chrome Sync (optional, off by default).** If you turn on **Backup → Sync with Chrome**, your settings and the themes
without a picture backdrop are also saved in `chrome.storage.sync`, which Chrome keeps in step across the computers
signed in to your Chrome profile (subject to Google's own privacy policy). Pictures are never synced. Turning the
option off stops syncing.

### What Auroreel does not do

- No account, no server: Auroreel never sends your data to its developers or anyone else.
- No analytics, tracking, advertising or telemetry.
- It does not read, record or transmit what you watch, your history, your messages or any page content. On the
  supported sites it reads the page's stylesheets (to know its colours) and the video element (to change speed and
  filters, draw the ambient light and save a frame when you ask).
- Saved frames go straight to your Downloads folder through the browser.

### Network requests

Auroreel makes no requests of its own, with one exception: to read the colours of a supported site whose stylesheets
are hosted on another domain, it downloads those same public stylesheets again (for example VieON's
`static2.vieon.vn`). No personal data or cookies are sent with these requests.

### Permissions

| Permission                                                                                                                                  | Purpose                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| www.youtube.com, music.youtube.com, www.twitch.tv, www.netflix.com, www.primevideo.com, www.disneyplus.com, vimeo.com, fptplay.vn, vieon.vn | Apply your theme and the player tools on these sites.                                                                             |
| \*.vieon.vn                                                                                                                                 | Read the colours in VieON's stylesheets, which live on its own CDN.                                                               |
| Storage                                                                                                                                     | Keep your settings and themes (and sync them, if you turn that on).                                                               |
| Scripting                                                                                                                                   | Turn on the player tools for every other site — only if you allow it.                                                             |
| Optional: all sites                                                                                                                         | Asked only when you choose "Allow on all sites"; you can withdraw it any time (Sites → Turn off, or Chrome's extension settings). |

### Backups

**Backup → Export** writes a JSON file to your computer. Importing reads a file you pick and stores its contents
locally.

### Contact

Questions: open an issue at <https://github.com/Tanx-1811/auroreel/issues>.

## Tiếng Việt

Auroreel là tiện ích trình duyệt làm đẹp các trang xem video và thêm công cụ trình phát. Mọi thứ chạy trong trình
duyệt của bạn.

**Auroreel lưu gì:** cài đặt; chủ đề bạn tạo (kể cả ảnh nền bạn chọn, đã thu nhỏ); ảnh bạn chọn cho nút kéo trên thanh
tiến độ (thu về 96 px, chỉ lưu trên máy này); tốc độ gần nhất trên từng trang
(nếu bạn bật); bộ nhớ đệm màu của các trang được hỗ trợ. Tất cả nằm trong bộ nhớ tiện ích trên máy này và bị xoá khi
gỡ Auroreel hoặc chọn **Sao lưu → Đặt lại Auroreel**.

**Đồng bộ qua Chrome (tuỳ chọn, mặc định tắt):** khi bật, cài đặt và các chủ đề không có ảnh nền được lưu thêm vào
`chrome.storage.sync` để Chrome đồng bộ giữa các máy cùng hồ sơ Chrome (theo chính sách quyền riêng tư của Google).
Ảnh không bao giờ được đồng bộ.

**Auroreel không làm gì:** không tài khoản, không máy chủ, không gửi dữ liệu cho nhà phát triển hay bất kỳ ai; không
phân tích, theo dõi hay quảng cáo; không đọc, ghi lại hay gửi đi những gì bạn xem, lịch sử hay nội dung trang. Trên
các trang được hỗ trợ, Auroreel chỉ đọc bảng CSS (để biết màu) và phần tử video (để chỉnh tốc độ, màu hình, vẽ ánh sáng
nền và lưu khung hình khi bạn yêu cầu).

**Kết nối mạng:** Auroreel không tự gửi yêu cầu nào, trừ việc tải lại chính các tệp CSS công khai của trang được hỗ
trợ khi chúng nằm ở tên miền khác (ví dụ `static2.vieon.vn` của VieON), không kèm dữ liệu cá nhân hay cookie.

**Liên hệ:** <https://github.com/Tanx-1811/auroreel/issues>.
