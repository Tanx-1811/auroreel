# Nộp Auroreel lên Chrome Web Store — hướng dẫn từng bước

Mọi thứ cần nộp đều tạo được từ repo bằng một lệnh. Những việc chỉ chủ sở hữu làm được: đăng ký tài khoản nhà phát
triển, bật xác minh 2 bước, chọn email liên hệ, công khai chính sách quyền riêng tư và bấm gửi duyệt.

## 0. Tạo bộ hồ sơ

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:e2e
npm run test:live      # YouTube, Twitch, Netflix, FPT Play, VieON, Prime Video thật (cần mạng)
npm run screenshots    # chỉ khi giao diện đổi
npm run store
```

`npm run store` đóng gói rồi kiểm tra theo giới hạn của Store: cỡ ảnh, số ảnh chụp, độ dài tên và tóm tắt, tên và tóm
tắt khớp `_locales`, mô tả không nêu quá 5 trang web. Sau đó nó gom mọi thứ vào `release/auroreel-<phiên bản>-store/`:

| Tệp / thư mục                      | Dùng để                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| `0 - Hướng dẫn nộp từng bước.md`   | Tài liệu này                                                                           |
| `1 - auroreel-<phiên bản>.zip`     | Gói tải lên                                                                            |
| `2 - Ảnh/`                         | Biểu tượng 128px, 5 ảnh chụp 1280×800 (EN, VI), ảnh quảng bá 440×280 và 1400×560       |
| `3 - Điền từng ô trên Store.txt`   | Từng ô trên Developer Dashboard kèm đúng chữ cần dán (sinh từ `docs/STORE_LISTING.md`) |
| `4 - Chính sách quyền riêng tư.md` | Nội dung trang chính sách (bản gốc: `docs/PRIVACY.md`)                                 |

Chữ trên Store sửa ở `docs/STORE_LISTING.md`, rồi chạy lại `npm run store`.

## 1. Tài khoản nhà phát triển (một lần)

1. Bật **xác minh 2 bước** cho tài khoản Google sẽ đứng tên: Store bắt buộc trước khi đăng.
2. Mở <https://chrome.google.com/webstore/devconsole>, đồng ý điều khoản và trả **phí đăng ký một lần** (5 USD).
3. Điền tên nhà phát triển (hiện trên Store) và **email liên hệ**: email này công khai. Xác minh email.
4. **Trader / non-trader** (luật DSA của EU): phát hành miễn phí với tư cách cá nhân thì thường chọn _non-trader_.
   Google để bạn tự quyết về mặt pháp lý. Chọn _trader_ thì phải công khai tên, địa chỉ và số điện thoại.

## 2. Công khai chính sách quyền riêng tư

Store cần một địa chỉ công khai cho chính sách quyền riêng tư. Ngoài ra, nút "Visit website" của Chrome và trang Giới
thiệu trong Studio cũng trỏ về repo GitHub. Trong khi repo còn **riêng tư**, các liên kết này đều báo 404.

- **Cách gọn nhất:** chuyển repo sang công khai (mã nguồn MIT), rồi dùng
  `https://github.com/Tanx-1811/auroreel/blob/main/docs/PRIVACY.md`.
- **Nếu muốn giữ repo riêng tư:** đăng nội dung `4 - Chính sách quyền riêng tư.md` lên một trang công khai (GitHub
  Gist, Notion công khai…) và dán địa chỉ đó. Các liên kết GitHub trong Studio vẫn báo 404 cho người dùng.

## 3. Điền hồ sơ

Mở `3 - Điền từng ô trên Store.txt` và làm theo thứ tự:

1. **Package:** New item → chọn tệp zip.
2. **Store listing:** mô tả EN, danh mục _Functionality & UI_, ảnh, rồi thêm bản tiếng Việt.
3. **Privacy practices:** mục đích duy nhất, giải trình 3 quyền (storage, scripting, host permission), không tích dữ liệu nào, ba cam
   kết, địa chỉ chính sách.
4. **Test instructions:** các bước cho người duyệt (không cần tài khoản).
5. **Distribution:** Free, Public, All regions.

Bấm **Save draft** sau mỗi thẻ, rồi **Submit for review**.

## 4. Thời gian duyệt

Thường vài ngày, có khi vài tuần. Lần đầu nộp và xin quyền trên nhiều trang thì Store duyệt kỹ hơn. Nếu bị hỏi lại,
phần giải trình quyền trong hồ sơ đã nêu rõ từng quyền dùng để làm gì. Quá 3 tuần chưa có kết quả thì liên hệ bộ phận
hỗ trợ của Chrome Web Store.

Lý do bị từ chối hay gặp với loại extension này, và cách hồ sơ đã tránh:

- **Spam từ khoá:** mỗi mô tả nêu tối đa 5 trang web, chữ "YouTube" tối đa 4 lần (`npm run store` kiểm tra).
- **Nhãn hiệu:** tên không chứa "YouTube". Lần nhắc đầu tiên ghi "YouTube™", cuối mô tả có câu ghi nhận nhãn hiệu
  của Google. Ảnh chụp dùng trang mẫu "Viewly", không dùng logo của các trang.
- **Quyền quá rộng:** quyền "mọi trang" là tuỳ chọn, chỉ xin khi người dùng bấm, và đã có giải trình riêng.

## 5. Phát hành bản mới

1. Tăng `version` trong `package.json`, ghi `CHANGELOG.md`.
2. Chạy đủ bước 0.
3. Commit, gắn tag `vX.Y.Z` và đẩy tag. CI (chỉ chạy khi có tag hoặc khi bấm Run workflow) kiểm tra rồi tạo gói
   `auroreel-extension` để tải về.
4. Trong Developer Dashboard: **Package → Upload new package**, rồi gửi duyệt.

## Microsoft Edge Add-ons (không bắt buộc)

Gói Chrome chạy nguyên trên Edge. Đăng ký miễn phí tại <https://partner.microsoft.com/dashboard/microsoftedge>, tải lên
cùng tệp zip và dùng lại mô tả, ảnh và chính sách ở trên.
