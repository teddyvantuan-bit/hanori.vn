# hanori.vn

Website Hanori gồm trang chủ, 18 trang sản phẩm, danh mục, 5 bài viết và các trang thông tin. Nội dung HTML vẫn phục vụ độc lập trên GitHub Pages.

Nhánh `codex/hanori-checkout-foundation` chuẩn bị COD, thanh toán payOS, báo phí GHN và đồng bộ đơn vào Google Sheet. **Chưa bật trên website thật.**

- [Lộ trình kết hợp SEO và bán hàng](docs/LO-TRINH-HANORI.md)
- [Thiết lập và vận hành đơn hàng](docs/KICH-HOAT-BAN-HANG.md)
- [Cấu trúc Google Sheet](server/sheet-schema.json)

## Chạy và kiểm tra

Yêu cầu Node.js 24 trở lên. Không cần cài thêm thư viện.

```sh
npm test
npm start
```

Mở `http://localhost:8787/`. Khi chưa cấu hình tài khoản, API trả thông báo chưa sẵn sàng. Giao diện mặc định tiếp tục chuẩn bị yêu cầu qua Zalo, có lựa chọn COD/chuyển khoản.

Để xem toàn bộ luồng bằng dữ liệu giả:

```sh
node tests/preview.mjs
```

Mở `http://localhost:8788/`. Bản này có nhãn kiểm thử, lưu vào bộ nhớ tạm, mô phỏng phí ship và thanh toán, không gọi GHN/payOS/Google. **Không triển khai máy chủ kiểm thử lên Internet.**

## Triển khai

GitHub Pages chỉ chạy phần HTML/JS tĩnh; không thể giữ khóa thanh toán hoặc nhận webhook. Để bật checkout tự động, cần máy chủ Node 24 có ổ đĩa bền vững, HTTPS và tuyến `/api/*` cùng tên miền website. Hướng dẫn chi tiết nằm trong tài liệu kích hoạt. Không đưa `.env`, cơ sở dữ liệu hay khóa Google vào thư mục public hoặc Git.

## Thiết kế mobile và media

Giao diện dùng `assets/storefront.css`, gallery/chọn mẫu tại `assets/pdp.js`, danh mục/giỏ hàng tại `assets/shop.js`. [Thiết kế, kiểm tra và giới hạn](docs/THIET-KE-TRAI-NGHIEM.md). Tạo lại ảnh tối ưu bằng `python3 scripts/build_media.py` (cần Pillow); ảnh gốc không bị thay thế.
