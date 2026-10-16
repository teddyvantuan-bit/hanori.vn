# Hanori — thiết kế và trải nghiệm mobile

Ngày kiểm tra: 16/10/2026. Bản phát triển, chưa triển khai website thật.

## Thiết kế

Nền kem ấm, chữ xanh trầm, điểm nhấn đất nung; ảnh thật là trọng tâm. Trang chủ dẫn từ không gian sử dụng sang sáu sản phẩm nổi bật và cẩm nang. Giảm banner khuyến mại, hiệu ứng chặn nội dung và các nút nổi cạnh tranh với nút mua.

Danh mục có hai cột trên điện thoại, tìm kiếm không dấu theo từng từ, lọc không gian và sắp xếp giá theo mức thấp nhất của phân loại. Bộ lọc lưu trong URL và khôi phục khi quay lại.

Trang sản phẩm cho chọn phân loại ngay tại chỗ, cập nhật giá/ảnh/mã sản phẩm, xem ảnh lớn và mua từ thanh cố định. Chưa chọn phân loại thì hướng dẫn khách chọn trước. Giỏ và biểu mẫu dùng vùng bấm lớn, giữ thông tin khi quay lại và cho sửa thông tin từ bước kiểm tra.

## Media

18 ảnh bìa WebP 400px, 18 atlas thumbnail cho 245 ảnh và hai kích thước ảnh chủ đạo trang chủ. Tổng ảnh bìa từ 1.099.460 xuống 284.168 byte (giảm khoảng 74%). Ảnh gốc giữ cho gallery và phóng lớn; không tạo hoặc sửa hình dáng sản phẩm. Danh sách nguồn nằm trong scripts/media-covers.json; tạo lại bằng scripts/build_media.py với Pillow. manifest trong assets/media ghi dung lượng và số ảnh từng sản phẩm.

## Kiểm tra

- Trang chủ, danh mục, sản phẩm một phiên bản và nhiều phân loại: 320×740, 390×844, 430×932, 1440×1000; không tràn ngang.
- Tìm “thung gao”, sắp xếp giá, không có kết quả, đổi danh mục và quay lại từ sản phẩm.
- Mua khi chưa chọn mẫu; chọn 10kg trà sữa nâu cập nhật 333.000đ và ảnh đúng; thanh mua tính theo số lượng.
- Giỏ hàng, biểu mẫu thiếu thông tin/sai điện thoại, quay lại giữ dữ liệu, kiểm tra yêu cầu COD dưới 200.000đ và chỉnh sửa; mở/đóng ảnh lớn.
- 33 HTML kiểm tra đường dẫn nội bộ, ID, H1 và JSON-LD; giữ 31 URL sitemap, 18 trang sản phẩm và 5 bài viết.
- 20 kiểm tra tự động về đơn hàng/thanh toán đều đạt. Không phát sinh giao dịch hoặc vận đơn thật.

## Giới hạn phát hành

Chưa có đo lường Core Web Vitals thực tế hoặc thử trên thiết bị iPhone/Android thật. Cần kiểm tra sau triển khai trên hosting mục tiêu. Không tuyên bố mức tăng chuyển đổi khi chưa có dữ liệu.

commerceEnabled vẫn false: luồng hiện tại chuẩn bị yêu cầu để khách gửi qua Zalo; không giả báo đã lưu đơn hoặc đã thanh toán. COD và chuyển khoản thể hiện rõ cần shop xác nhận. Kích hoạt dịch vụ tự động là công việc riêng trong docs/KICH-HOAT-BAN-HANG.md.
