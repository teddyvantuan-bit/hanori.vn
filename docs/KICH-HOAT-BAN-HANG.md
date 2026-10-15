# Kích hoạt và vận hành bán hàng Hanori

Trạng thái: mã nguồn và kiểm thử mô phỏng đã chuẩn bị; chưa triển khai, chưa giao dịch thật. `commerceEnabled` mặc định `false` để khách gửi yêu cầu qua Zalo trong giai đoạn thiết lập.

## Tài khoản cần chủ shop thực hiện

1. [GHN](https://khachhang.ghn.vn/): đăng ký bằng số điện thoại shop, tự nhập OTP và chấp nhận điều khoản. Thêm điểm lấy hàng Tổ dân phố Tống Văn, phường Trần Lãm, Hưng Yên, 0962 818 892. Đối chiếu vị trí với GHN. Lấy Token và ShopId, cất vào hệ thống lưu bí mật của nơi chạy máy chủ.
2. [payOS](https://my.payos.vn/login): đăng ký, xác thực chủ thể kinh doanh và liên kết tài khoản nhận tiền đáp ứng điều kiện của dịch vụ. Chủ shop tự thực hiện bước xác minh danh tính/ngân hàng. Tạo kênh thanh toán và lấy Client ID, API Key, Checksum Key vào hệ thống bí mật. Không gửi khóa, OTP hoặc ảnh CCCD vào chat.
3. Google: bảng `Hanori — Quản lý đơn website` đã tạo ở ID trong `.env.example`, có tab `Đơn hàng` theo `server/sheet-schema.json` và tab `Hướng dẫn`, đủ 10.000 dòng. Đã đặt cảnh báo khi sửa A:P, danh sách trạng thái xử lý ở Q và định dạng tiền. A:P dành cho hệ thống, Q:T cho đội vận hành. Bảng chưa tự nhận đơn vì máy chủ chưa kích hoạt. Chỉ đội xử lý đơn được truy cập.
4. Để web tự ghi Sheet liên tục, cần một Google service account với Sheets API và quyền chỉnh sửa riêng bảng này. Kết nối Drive trong chat không tự cấp quyền cho website. Lưu khóa JSON ngoài cây public, trỏ `GOOGLE_SERVICE_ACCOUNT_FILE` tới file bí mật của máy chủ. Không đưa khóa vào repository.

COD có thể kích hoạt trước payOS khi GHN và Sheet đã sẵn sàng. Chuyển khoản tự động chỉ mở khi đủ khóa payOS; lúc chưa đủ, lựa chọn đó được đánh dấu đang thiết lập.

## Kiện hàng và báo phí

Không áp giá ship cố định hoặc suy đoán trọng lượng từ ảnh/bảng đóng thùng nguồn. Cân sản phẩm sau khi đóng gói, đo chiều dài/rộng/cao của kiện. Điền `server/packages.json` theo SKU: `weight` gram, `length`, `width`, `height` centimet, đều là số nguyên dương. Chưa có dữ liệu thì website yêu cầu hỗ trợ Zalo.

Giỏ nhiều món mặc định chưa được báo phí tự động. Để mở, shop cần kiểm tra cách xếp kiện thực tế theo quy tắc: dài/rộng lấy lớn nhất của các hộp, cao cộng các hộp, cộng lớp bao ngoài và trọng lượng bao ngoài. Chỉ thêm `_packing: { "verified": true, "extraWeight": <gram đã đo>, "padding": <cm đã đo> }` sau khi xác nhận cách này phù hợp. Nếu shop dùng cách đóng khác, thay quy tắc trước khi bật. Kiện từ 20kg chuyển sang báo phí riêng trong phiên bản này.

Địa chỉ lấy từ danh mục hành chính 2 cấp mới của GHN. Máy chủ dùng `shipping-order/preview` để xác nhận tuyến và phí, không tạo vận đơn khi khách chỉ xem phí. Điểm gửi mặc định theo ShopId. Không tự chuyển “Trần Lãm, Hưng Yên” sang mã huyện cũ.

Miễn ship từ đúng 200.000đ tiền hàng. Vẫn lưu `carrierFee` để shop biết khoản mình chi trả. COD thu tiền hàng + phí khách trả; máy chủ tính lại phí với số tiền COD cuối cùng trước khi chốt. Nếu phí chưa ổn định hoặc GHN lỗi thì không tạo đơn có tổng tiền chưa rõ.

Nguồn: [GHN preview](https://developer.ghn.vn/vi/docs/order/preview), [địa chỉ mới](https://developer.ghn.vn/vi/docs/master-data/get-ward-new), [quy tắc kiện và phí](https://developer.ghn.vn/vi/docs/order/calculate-fee).

## Máy chủ và tên miền

- Node.js 24+, một tiến trình ghi đơn, ổ đĩa bền vững cho `data/hanori.sqlite`, không dùng ổ đĩa tạm của serverless. Sao lưu SQLite bằng công cụ hỗ trợ online backup hoặc khi tiến trình đã dừng; không chỉ chép file DB đang có WAL.
- Máy chủ phục vụ HTML/ảnh và `/api/*` cùng nguồn. Đặt reverse proxy HTTPS phía trước. Không cache `/api/*`. `PUBLIC_ORIGIN` phải khớp chính xác `https://hanori.vn`.
- Máy chủ mặc định nghe `127.0.0.1:8787`. Nếu nền tảng yêu cầu, đặt `HOST=0.0.0.0` và cấu hình mạng phù hợp. Không đưa máy chủ mô phỏng trong `tests/preview.mjs` lên Internet.
- GitHub Pages có thể tiếp tục chạy phần tĩnh; nếu giữ Pages, cần proxy `/api/*` về Node cùng tên miền. Không trỏ trực tiếp `commerceApiBase` sang domain khác khi chưa triển khai CORS phù hợp.
- Điền `.env` theo `.env.example` bằng secret store. Chạy `npm test`, rồi `npm start`. `GET /api/config` cho biết COD/BANK đã đủ cấu hình hay chưa; đây chỉ là kiểm tra có cấu hình, chưa khẳng định tài khoản hoạt động.

Chỉ đổi `commerceEnabled: true` khi thử nghiệm thật đạt các điều kiện bên dưới. Bản sửa này chưa tự đăng ký dịch vụ hosting có phí.

## Luồng đơn và tiền

Máy chủ tính giá từ catalog, kiểm tra phân loại/số lượng và báo phí có hạn 15 phút. Dữ liệu giá/phí do trình duyệt gửi không được dùng để thu tiền. Đơn được lưu SQLite trước; bấm lại cùng mã yêu cầu trả lại cùng đơn.

COD: trạng thái `COD_PENDING`, không tạo link payOS, không đánh dấu đã thu tiền và không phát sự kiện `purchase`. Shop xác nhận tồn/địa chỉ, tạo vận đơn GHN thủ công với số tiền thu hộ đúng `Tổng thu khách`; phí GHN do shop trả để không thu phí hai lần. Ghi vận đơn ở Sheet cột R, trạng thái xử lý ở Q. Khi hoàn/hủy, cập nhật Q/T. Khi có chứng từ tiền thu hộ, ghi số đã thu ở S và đối soát tiền GHN chuyển về. Phiên bản này chưa có webhook trạng thái giao hàng/COD và chưa tự hoàn tiền.

Chuyển khoản: trạng thái `PENDING`, trả link payOS cho khách. Webhook `/api/webhooks/payos` kiểm tra HMAC và hỏi lại merchant API; chỉ khi đúng orderCode, paymentLinkId, số tiền và trạng thái PAID/đủ tiền mới đánh dấu `PAID`. Khách quay lại theo return URL cũng phải kiểm tra máy chủ. Thiếu tiền, chữ ký sai hoặc sai mã link không xác nhận đã thu tiền.

Đăng ký webhook HTTPS trên kênh payOS sau khi triển khai. payOS có thể gửi mẫu có chữ ký khi xác minh URL; mẫu không khớp đơn sẽ được tiếp nhận mà không tạo đơn. Trạng thái PAID không tự lùi về PENDING khi webhook lặp lại.

Nguồn: [payOS API](https://payos.vn/docs/api/), [xác minh chữ ký](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/), [điều kiện xác thực](https://payos.vn/docs/huong-dan-su-dung/xac-thuc-to-chuc/).

## Google Sheet và sự cố

SQLite là bản ghi gốc; Google Sheet là nơi đội shop theo dõi. Bộ đồng bộ chạy 15 giây/lần, cập nhật theo mã đơn, dùng giá trị RAW để nội dung khách nhập không thành công thức. Cột A:P do hệ thống quản lý; Q:T không bị ghi đè. Dùng chế độ xem bộ lọc; không sắp xếp/chèn/xóa hàng trong lúc bộ đồng bộ ghi. Dừng bộ đồng bộ trước khi chỉnh cấu trúc.

Khi Sheet lỗi, đơn vẫn ở DB và được thử lại. Theo dõi log `Google Sheet sync pending`, kiểm tra hằng ngày trong vận hành. Bản này chưa có cảnh báo ngoài hệ thống hoặc màn hình quản trị DB; phải bổ sung cảnh báo vận hành trước khi chạy không giám sát. Không được coi bảng trống là không có đơn nếu bộ đồng bộ đang lỗi.

Google Sheet không phải kho tồn và không phải bằng chứng payOS đã thu tiền. Không sửa cột I để giả lập thanh toán. Đơn COD vẫn ghi chờ thu tiền ở cột I; cột S là bản ghi đối soát thủ công, cần chứng từ đi kèm.

## Nghiệm thu trước khi bật

1. Tài khoản GHN hoạt động; điểm lấy hàng đúng; số đo kiện và cách đóng giỏ nhiều món đã kiểm tra. So sánh phí GHN trên dashboard với báo phí website cho ít nhất một tuyến gần, một tuyến xa và một giỏ nhiều món.
2. Đơn dưới 200.000đ có phí rõ, đơn đúng 200.000đ và trên ngưỡng có phí khách trả 0đ, cước shop chịu vẫn được lưu.
3. Đơn COD xuất hiện trong Sheet, chưa được đánh dấu đã thu tiền; tạo thử vận đơn chỉ khi chủ shop cho phép và xác nhận thông tin gửi.
4. payOS xác minh webhook thành công; thử thanh toán/huỷ/thiếu tiền/lặp callback theo môi trường phù hợp. Mọi chuyển tiền thật do chủ shop thực hiện. Không bật chỉ dựa trên kiểm thử mô phỏng.
5. Kiểm tra thông tin khách có đủ trong Sheet, đơn trùng không xuất hiện khi bấm lại, thử mất kết nối Sheet và xác nhận đồng bộ bù.
6. Kiểm tra desktop/điện thoại, thông tin hỗ trợ và chính sách mua hàng thống nhất. Chưa kết nối GA4 thì không báo có số liệu chuyển đổi; khi kết nối, kiểm tra DebugView và không gửi họ tên/số điện thoại/địa chỉ vào sự kiện.

## Kiểm tra đã thực hiện trong nhánh

20 kiểm tra tự động: ranh giới miễn ship, giá máy chủ, phân loại/số lượng sai, chữ ký mẫu payOS, báo phí, chống trùng, khôi phục khi tạo link bị timeout, bảo vệ trạng thái đơn, tiền thiếu/sai link, webhook lặp, Sheet lỗi/thử lại, địa chỉ GHN mới, COD và số tiền thu hộ.

Đã thao tác trình duyệt trên bản mô phỏng: chọn túi rác loại 49.000đ; báo phí giả 27.000đ; đặt COD 76.000đ và giữ trạng thái chưa thu tiền; đặt chuyển khoản 260.000đ phí ship 0đ; qua trang thanh toán giả rồi quay lại xác nhận PAID. Đã xem giao diện COD ở kích thước 390×844. Không tạo đơn hay thanh toán thật tại nhà cung cấp.
