# Nộp Reelskin lên Chrome Web Store — hướng dẫn từng bước

Mọi thứ cần nộp đã có sẵn trong repo. Những việc chỉ chủ sở hữu làm được: đăng ký tài khoản nhà phát triển (phí một
lần), chọn email hỗ trợ, công khai repo (để có địa chỉ chính sách quyền riêng tư) và bấm gửi duyệt.

## 0. Chuẩn bị (đã có sẵn)

| Cần                       | Ở đâu                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Gói tải lên               | `release/reelskin-<phiên bản>.zip` — tạo lại bằng `npm run package`                      |
| Biểu tượng cửa hàng 128px | `brand/store/store-icon-128.png`                                                         |
| Ảnh chụp 1280×800         | `brand/store/screenshots/vi-1…5-*.png` (tiếng Việt) và `en-1…5-*.png` (tiếng Anh)        |
| Ảnh quảng bá nhỏ 440×280  | `brand/store/promo-small-440x280-vi.png` / `promo-small-440x280.png`                     |
| Ảnh quảng bá lớn 1400×560 | `brand/store/promo-marquee-1400x560-vi.png` / `promo-marquee-1400x560.png`               |
| Nội dung trang cửa hàng   | `docs/STORE_LISTING.md` (tên, tóm tắt, mô tả EN + VI, giải trình quyền, dữ liệu sử dụng) |
| Chính sách quyền riêng tư | `docs/PRIVACY.md` (EN + VI) — cần địa chỉ công khai, xem bước 5                          |

Trước mỗi lần nộp:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:e2e
npm run test:live      # YouTube, Twitch, Netflix, FPT Play, VieON, Prime Video thật (cần mạng)
npm run package
```

## 1. Tài khoản nhà phát triển

1. Mở <https://chrome.google.com/webstore/devconsole> bằng tài khoản Google muốn đứng tên.
2. Đồng ý điều khoản và trả **phí đăng ký 5 USD một lần**.
3. Điền tên nhà phát triển (hiện trên cửa hàng) và **email liên hệ** — email này sẽ công khai. Xác minh email.

## 2. Tải gói lên

1. Bấm **New item** → chọn `release/reelskin-1.0.0.zip`.
2. Cửa hàng tự đọc tên, mô tả ngắn (từ `public/_locales/*/messages.json`) và biểu tượng.

## 3. Thẻ "Store listing"

- **Mô tả chi tiết:** dán phần _Description — English_ trong `docs/STORE_LISTING.md`. Thêm bản địa hoá **Tiếng Việt**
  (Add localization → Vietnamese) và dán phần _Mô tả — Tiếng Việt_.
- **Danh mục:** Make Chrome Yours. **Ngôn ngữ:** English, Vietnamese.
- **Hình ảnh:** biểu tượng 128px, 5 ảnh chụp (bản EN cho tiếng Anh, bản VI cho tiếng Việt), ảnh quảng bá nhỏ và lớn.
- **Trang chủ / hỗ trợ:** `https://github.com/Tanx-1811/reelskin` và `https://github.com/Tanx-1811/reelskin/issues`.

## 4. Thẻ "Privacy practices"

- Dán **Single purpose** và từng **giải trình quyền** trong phần _Privacy practices_ của `docs/STORE_LISTING.md`
  (quyền trên các trang xem phim, `*.vieon.vn`, `storage`, `scripting`, quyền tuỳ chọn trên mọi trang).
- **Remote code:** No. **Data usage:** không thu thập gì — không tick mục nào; đánh dấu ba cam kết.
- **Privacy policy:** địa chỉ ở bước 5.

## 5. Chính sách quyền riêng tư

Khi repo công khai, dùng: `https://github.com/Tanx-1811/reelskin/blob/main/docs/PRIVACY.md`. Nếu muốn giữ repo
riêng tư, đăng `docs/PRIVACY.md` lên một trang công khai bất kỳ (GitHub Gist, Notion công khai…) rồi dán địa chỉ đó.

## 6. Gửi duyệt

Bấm **Submit for review**. Lần đầu thường mất vài ngày vì extension xin quyền trên nhiều trang. Nếu bị hỏi lại, phần
giải trình trong `docs/STORE_LISTING.md` đã nêu rõ từng quyền dùng để làm gì.

## 7. Phát hành bản mới

1. Tăng `version` trong `package.json`, ghi `CHANGELOG.md`.
2. Chạy đủ kiểm tra ở bước 0, `npm run package`, `npm run screenshots` nếu giao diện đổi.
3. Commit, gắn tag `vX.Y.Z` và đẩy tag — CI (chỉ chạy khi có tag hoặc bấm Run workflow) kiểm tra và tạo gói
   `reelskin-extension` để tải về.
4. Trong Developer Dashboard: **Package → Upload new package**, rồi gửi duyệt.

## Microsoft Edge Add-ons (không bắt buộc)

Gói Chrome chạy nguyên trên Edge. Đăng ký miễn phí tại <https://partner.microsoft.com/dashboard/microsoftedge>, tải
cùng tệp zip, dùng lại mô tả, ảnh và chính sách ở trên.
