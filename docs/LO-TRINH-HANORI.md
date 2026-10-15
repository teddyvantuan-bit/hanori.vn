# Hanori — lộ trình SEO và bán hàng kết hợp

Cập nhật 15/10/2026. Kế hoạch gốc do chủ shop cung cấp; các nhận định về đã index/chỉ số Search Console cần đối chiếu tài khoản, không suy ra từ mã nguồn.

## Mục tiêu và quyết định đã chốt

Website là kênh nhận đơn riêng, hoạt động song song Shopee. Đo thành công bằng đơn được xác nhận, tiền thu thực tế và lợi nhuận sau chi phí; không chỉ lượng truy cập.

- Thanh toán: thêm COD và chuyển khoản tự động; đã chuẩn bị kết nối payOS, chờ tài khoản được xác thực.
- Quản lý: Google Sheet; trao đổi khách qua Zalo.
- Ship: miễn phí khi tổng tiền hàng từ 200.000đ, bao gồm đúng mốc 200.000đ; dưới mốc tính theo địa chỉ và kiện hàng. Website chưa có mã giảm giá riêng.
- Nơi lấy hàng: Tổ dân phố Tống Văn, phường Trần Lãm, Hưng Yên; điện thoại 0962 818 892. Cần đối chiếu địa chỉ với danh mục GHN khi đăng ký shop, không tự gán mã hành chính cũ.
- Chưa có tài khoản GHN/J&T, payOS hoặc kết nối Google phía máy chủ. GHN là phương án tích hợp đầu tiên do có tài liệu API rõ; chưa kết luận GHN rẻ nhất.
- Tồn kho và vận đơn đợt đầu cần người vận hành xác nhận. Chưa triển khai tự trừ tồn hoặc đồng bộ Shopee.

## Kiểm tra nền tảng hiện có

| Hạng mục | Kết quả kiểm tra |
| --- | --- |
| Trang sản phẩm | Có 18 URL riêng, tiêu đề và dữ liệu Product/Offer trong mã nguồn |
| Blog | Có 5 bài và trang Tin tức; có liên kết bài viết/sản phẩm |
| Sitemap | Có 31 URL; cần theo dõi thu thập/index trong Search Console |
| Schema | Có Store, FAQPage, ItemList, Product và Article; đây không phải bằng chứng Google sẽ hiển thị rich result |
| Giỏ hàng cũ | Có lỗi giá phân loại; ví dụ túi rác hiển thị từ 49.000đ nhưng nút thêm nhanh lấy loại 66.000đ |
| Nhận đơn cũ | Chỉ lưu trên trình duyệt; không có bằng chứng lưu về shop hoặc xác minh tiền về |
| Chính sách ship | Nhiều nơi ghi miễn phí từ 0đ, khác quyết định 200.000đ |
| Đo lường | Chưa tìm thấy GA4/GTM/Meta trong mã nguồn được kiểm tra |

## Việc đã chuẩn bị trong nhánh này

1. Chọn phân loại trước khi thêm, giữ đúng giá, xử lý giỏ cũ hỏng, giới hạn 20 sản phẩm/phân loại.
2. Giữ thông tin khi quay lại giỏ; kiểm tra điện thoại; hiển thị tiến độ đạt miễn ship; thống nhất mức 200.000đ trên các trang.
3. Bỏ QR tạm tính khi chưa biết phí ship; giao diện gửi yêu cầu qua Zalo ghi rõ chưa nhận đơn/thu tiền tự động.
4. Chuẩn bị checkout tự động: địa chỉ 2 cấp của GHN, tính phí trước khi chốt, chọn COD hoặc payOS, lưu đơn SQLite trước khi xử lý thanh toán.
5. Chống tạo trùng khi bấm lại; xác minh chữ ký và đối chiếu mã link/số tiền; không tin cờ thanh toán trên URL.
6. Đồng bộ Google Sheet có hàng đợi thử lại. Phân biệt tiền hàng, phí khách trả và cước GHN shop chịu để tính biên lợi nhuận.
7. Có sự kiện `add_to_cart`, `begin_checkout`, `order_created`, `purchase` sẵn trong `dataLayer`, chưa kết nối công cụ phân tích. COD không phát `purchase` khi mới đặt.

## Thứ tự triển khai đã điều chỉnh

### 1. Nhận đơn và đo lường ngay từ đầu

Kích hoạt GHN, Sheet và COD; sau đó bật payOS khi tài khoản đủ điều kiện. Chuẩn bị GA4 hoặc công cụ đo lường được chọn, thử sự kiện bằng chế độ debug. Chỉ bật phần tự động sau thử nghiệm có kiểm soát với tài khoản thật. Giữ SEO đang có trong lúc làm checkout.

Điều kiện hoàn thành: khách trên điện thoại chọn đúng hàng → xem phí và tổng → đặt COD hoặc trả tiền → đơn được lưu → đội shop thấy đơn → xử lý giao hàng và đối soát tiền.

### 2. Vận hành và lợi nhuận

Mỗi ngày kiểm tra đơn mới, xác nhận tồn, tạo vận đơn trong GHN và cập nhật Sheet. COD cần đối chiếu tiền đơn vị vận chuyển thu/chuyển về; chuyển khoản đối chiếu payOS. Theo dõi hủy, hoàn, chi phí đóng gói, cước chiều đi/hoàn, giá vốn và chi phí thanh toán. Chỉ đề xuất tự động trừ tồn và đồng bộ sàn khi đã thống nhất nguồn tồn kho chính.

### 3. Tối ưu chuyển đổi

Ưu tiên sản phẩm có biên lợi nhuận tốt và sẵn hàng. Dùng ảnh đúng phân loại, kích thước rõ, đánh giá có nguồn xác thực, lợi ích cụ thể và hướng dẫn sử dụng. Thử combo đạt 200.000đ nhưng phải tính phần shop trợ giá ship; tránh đẩy doanh thu làm giảm lợi nhuận. Chưa thay giá theo bảng giá nguồn vì có đơn vị giá khác nhau cần xác nhận.

### 4. SEO và khách quay lại

Theo dõi index/canonical và truy vấn thực tế trong Search Console song song các bước trên. Viết thêm bài khi có nhóm từ khóa phù hợp sản phẩm, ưu tiên ý định mua và hướng dẫn giải quyết vấn đề. Chỉ bật remarketing/nhắc giỏ/thu thông tin marketing sau khi thống nhất công cụ, nội dung đồng ý và kênh gửi.

## Điều chỉnh các giả định SEO

- Google nói thu thập lại có thể mất vài ngày đến vài tuần; gửi yêu cầu không đảm bảo index. Không hứa mốc 2–8 tuần cho tất cả URL.
- Không dùng “10 URL/ngày” làm quota cố định. Giao diện Google có giới hạn và có thể thay đổi; gửi lặp lại không làm index nhanh hơn.
- FAQ rich result của Google chủ yếu dành cho website chính phủ/y tế đủ điều kiện; không dùng FAQ schema làm cam kết hiển thị đẹp cho shop gia dụng.
- Chưa xác minh số trang đã index hay các yêu cầu index trước đây vì chưa truy cập Search Console của Hanori.

Nguồn: [Google: yêu cầu thu thập lại](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), [Google: thay đổi FAQ rich result](https://developers.google.com/search/blog/2023/08/howto-faq-changes).

## Bảng theo dõi mỗi tuần

| Chỉ số | Nguồn | Cách hiểu |
| --- | --- | --- |
| URL được index và lỗi | Search Console → Pages | Theo dõi URL quan trọng, không chỉ tổng số |
| Click và impression tự nhiên | Search Console → Performance | Click không đồng nghĩa người truy cập duy nhất |
| Truy vấn kéo khách | Search Console → Queries | Xem theo nhóm trang, thiết bị và thời gian |
| Phiên và bắt đầu checkout | GA4/công cụ đã kết nối | Hiện chưa có số liệu xác minh |
| Đơn xác nhận | Nguồn đơn trên máy chủ/Sheet | Tách COD, chuyển khoản, hủy và hoàn |
| Tỷ lệ đặt đơn | Đơn website hợp lệ ÷ phiên website cùng kỳ | Giữ cùng định nghĩa và khoảng ngày |
| Tiền đã thu | payOS + đối soát COD | Tách tiền hàng/phí ship, trừ hoàn tiền |
| Lợi nhuận đóng góp | Tiền hàng − giá vốn − phí thanh toán − đóng gói − cước shop chịu − hoàn hàng − quảng cáo | Cần chuẩn hóa giá vốn trước khi tính |

Chưa tạo lịch tự động kiểm tra hàng tuần; đây là quy trình theo dõi được đề xuất, không phải thông báo đã bật.
