/* ============================================================
   Hanori — dữ liệu sản phẩm & cấu hình cửa hàng
   Mỗi sản phẩm có: img (ảnh bìa), g (số ảnh gallery tại
   /assets/products/<id>/01..NN.webp). Biến thể có vimg = số thứ
   tự ảnh để đổi hình khi khách chọn phân loại.
   ============================================================ */
window.HANORI = window.HANORI || {};

HANORI.config = {
  brand: "Hanori",
  bankBin: "970407",            // Techcombank
  bankName: "Techcombank",
  accountNo: "29925892892",
  accountName: "NGUYEN VAN TUAN",
  shopee: "https://shopee.vn/hanori.tino#product_list",
  zalo: "https://zalo.me/84962818892",
  messenger: "https://m.me/hanorivietnam",
  phone: "0962818892",
  phoneDisplay: "0962 818 892",
  orderWebhook: "",
  shippingNote: "Phí ship tính theo khu vực, nhân viên xác nhận khi chốt đơn.",
  freeShipThreshold: 0
};

function _p(id, g) { return "/assets/products/" + id + "/" + g + ".webp"; }

HANORI.products = [
  {
    id: "thung-gao-dong-ho", cat: "bep", badge: "Bán chạy", g: 13,
    img: _p("thung-gao-dong-ho", "01"),
    name: "Thùng đựng gạo có đồng hồ (nắp ghi ngày)",
    tag: "Lưu trữ nhà bếp",
    desc: "Thân trong suốt dễ quan sát lượng gạo, nắp khóa gài kín, vòng xoay ghi nhớ ngày đổ gạo, kèm cốc đong.",
    material: "PP + PET", sizes: "10kg · 15kg",
    variants: [
      { name: "10kg", sku: "A1137-2", price: 260000, orig: 360000, vimg: 1 },
      { name: "15kg", sku: "A1138-3", price: 377000, orig: 480000, vimg: 10 }
    ]
  },
  {
    id: "thung-gao-ep", cat: "bep", badge: "Bán chạy", g: 24,
    img: _p("thung-gao-ep", "01"),
    name: "Thùng gạo ép thông minh (5kg / 10kg)",
    tag: "Lưu trữ nhà bếp",
    desc: "Nhấn nút là gạo ra cốc, dáng thon gọn góc bếp, cửa sổ trong suốt theo dõi lượng gạo. Màu kem hoặc trà sữa nâu.",
    material: "PP + PET", sizes: "5kg · 10kg",
    variants: [
      { name: "5kg · Kem", sku: "yz-2625-4", price: 282000, orig: 400000, vimg: 22 },
      { name: "10kg · Kem", sku: "yz-2624-4", price: 333000, orig: 460000, vimg: 24 },
      { name: "5kg · Trà sữa nâu", sku: "CA1323-1", price: 282000, orig: 400000, vimg: 20 },
      { name: "10kg · Trà sữa nâu", sku: "CA1323-2", price: 333000, orig: 460000, vimg: 23 }
    ]
  },
  {
    id: "binh-nuoc-4l", cat: "bep", badge: "Mới", g: 10,
    img: _p("binh-nuoc-4l", "01"),
    name: "Bình nước tủ lạnh có vòi 4L",
    tag: "Nhà bếp",
    desc: "Dung tích 4 lít, thân trong suốt, vòi lấy nước tiện lợi, dáng dẹp vừa khít cánh tủ lạnh, miệng rộng dễ vệ sinh.",
    material: "ABS + PS + PP", sizes: "37,5 × 9,5 × 18 cm",
    price: 195000, orig: 245000, sku: "DA1311-1"
  },
  {
    id: "ke-gia-vi", cat: "bep", badge: "Combo", g: 10,
    img: _p("ke-gia-vi", "01"),
    name: "Kệ gia vị đa năng 3 trong 1",
    tag: "Ngăn nắp nhà bếp",
    desc: "Kệ để chai lọ, hộp gia vị 3 ngăn và ống đựng dụng cụ — gom gọn cả góc bếp. Kèm nhân vật mặt cười dễ thương.",
    material: "PP + PET + Silicon", sizes: "28 × 30 × 25,5 cm",
    price: 392000, orig: 620000, sku: "A1080"
  },
  {
    id: "ke-dao-keo", cat: "bep", badge: "", g: 15,
    img: _p("ke-dao-keo", "01"),
    name: "Kệ đựng dao, kéo & đũa muỗng",
    tag: "Ngăn nắp nhà bếp",
    desc: "Dao kéo riêng, đũa muỗng riêng, có khay hứng nước kéo rời dễ vệ sinh. Nhiều màu cho góc bếp thêm cá tính.",
    material: "ABS", sizes: "26 × 11,5 × 25,7 cm",
    variants: [
      { name: "Kem", sku: "A1221", price: 185000, orig: 250000, vimg: 1 },
      { name: "Kem + thỏ + nơ", sku: "A1221-2", price: 190000, orig: 260000, vimg: 12 },
      { name: "Đỏ Ankera", sku: "A1221-6", price: 190000, orig: 260000, vimg: 11 },
      { name: "Xanh cổ điển", sku: "A1221-7", price: 190000, orig: 260000, vimg: 13 }
    ]
  },
  {
    id: "thung-rac-dap", cat: "bep", badge: "Bán chạy", g: 15,
    img: _p("thung-rac-dap", "01"),
    name: "Thùng rác đạp chân nắp bật",
    tag: "Ngăn nắp nhà bếp",
    desc: "Đạp chân mở nắp, hai miệng mở tiện lợi, tông kem tối giản. Có thể thêm bộ phụ kiện trang trí mặt cười.",
    material: "PP", sizes: "10L · 15L · 20L",
    variants: [
      { name: "10L", sku: "B3014", price: 118000, orig: 210000, vimg: 4 },
      { name: "15L", sku: "B3015", price: 133000, orig: 240000, vimg: 5 },
      { name: "20L", sku: "B3016", price: 178000, orig: 280000, vimg: 9 }
    ]
  },
  {
    id: "thung-rac-treo", cat: "bep", badge: "", g: 17,
    img: _p("thung-rac-treo", "01"),
    name: "Thùng rác treo cánh tủ",
    tag: "Ngăn nắp nhà bếp",
    desc: "Treo gọn trên cánh tủ bếp, có vòng giữ túi rác đúng chiều, hai cách mở nắp. Chọn dung tích 8L hoặc 11L.",
    material: "PP + Co-polymer", sizes: "8L · 11L",
    variants: [
      { name: "8L trơn", sku: "B2391-1", price: 156000, orig: 210000, vimg: 11 },
      { name: "11L trơn", sku: "B2391-2", price: 175000, orig: 260000, vimg: 12 },
      { name: "8L mặt cười", sku: "B2391-3", price: 201000, orig: 250000, vimg: 13 },
      { name: "11L mặt cười", sku: "B2391-4", price: 220000, orig: 310000, vimg: 15 }
    ]
  },
  {
    id: "tui-rac", cat: "bep", badge: "", g: 11,
    img: _p("tui-rac", "01"),
    name: "Túi rác rút dây họa tiết hoa lá",
    tag: "Tiện ích nhà bếp",
    desc: "Dạng cuộn dễ cắt, miệng rút dây gom gọn nhanh, họa tiết hoa lá thanh nhã, lót vừa các loại thùng rác.",
    material: "HDPE", sizes: "15 cái/cuộn",
    variants: [
      { name: "15 cái × 3 cuộn", sku: "CA1373-2", price: 66000, orig: 90000 },
      { name: "60×80 · 15 cái/cuộn", sku: "CA1464-1", price: 49000, orig: 80000 }
    ]
  },
  {
    id: "ke-2-tang", cat: "tam", badge: "Bán chạy", g: 12,
    img: _p("ke-2-tang", "01"),
    name: "Kệ bầu dục treo tường (hút chân không)",
    tag: "Ngăn nắp phòng tắm",
    desc: "Hút chân không không cần khoan, viền cao ôm gọn chai lọ, đáy trong suốt. Chọn 1 tầng hoặc 2 tầng.",
    material: "ABS + PET", sizes: "40 × 15 cm",
    variants: [
      { name: "1 tầng", sku: "DD2453-1", price: 160000, orig: 235000, vimg: 8 },
      { name: "2 tầng", sku: "DD2453-2", price: 320000, orig: 470000, vimg: 4 }
    ]
  },
  {
    id: "ke-tam-giac", cat: "tam", badge: "", g: 13,
    img: _p("ke-tam-giac", "01"),
    name: "Kệ góc tam giác phòng tắm",
    tag: "Ngăn nắp phòng tắm",
    desc: "Kệ góc hút chân không, khe thoát nước chống đọng, dễ tháo lắp đổi vị trí. Chọn 1 tầng hoặc 2 tầng.",
    material: "ABS + PET", sizes: "15 × 33 cm",
    variants: [
      { name: "1 tầng", sku: "DD2452-1", price: 156000, orig: 210000, vimg: 10 },
      { name: "2 tầng", sku: "DD2452-2", price: 295000, orig: 420000, vimg: 11 }
    ]
  },
  {
    id: "moc-hut-chan-khong", cat: "tam", badge: "", g: 17,
    img: _p("moc-hut-chan-khong", "01"),
    name: "Móc treo hút chân không (chữ U / Oval)",
    tag: "Ngăn nắp phòng tắm",
    desc: "Dán lên bề mặt phẳng nhẵn, giữ chắc khăn tắm, bông tắm. Hai kiểu móc chữ U và Oval cho nhiều lựa chọn.",
    material: "ABS", sizes: "Bộ 2 cái",
    variants: [
      { name: "Oval · 2 cái", sku: "DB2422-4", price: 119000, orig: 180000, vimg: 10 },
      { name: "Móc dài · 1 cái", sku: "DB2435-1", price: 69000, orig: 110000, vimg: 16 }
    ]
  },
  {
    id: "kep-treo-meo", cat: "tam", badge: "", g: 11,
    img: _p("kep-treo-meo", "01"),
    name: "Kẹp treo tường hình mèo (gấp gọn)",
    tag: "Tiện ích gia đình",
    desc: "Kẹp giữ cán chổi, cây lau nhà gọn một góc tường, họa tiết mèo đáng yêu, gập lại khi không dùng.",
    material: "PP + TPE", sizes: "8,2 × 7 × 6,5 cm",
    price: 75000, orig: 120000, sku: "DB1511-1"
  },
  {
    id: "hop-mini-treo-tuong", cat: "tam", badge: "-34%", g: 11,
    img: _p("hop-mini-treo-tuong", "01"),
    name: "Hộp đựng đồ mini treo tường (hành tỏi / mỹ phẩm)",
    tag: "Ngăn nắp phòng tắm",
    desc: "Hộp nhỏ gọn có nắp đậy chống bụi, đựng bông tẩy trang, phụ kiện trang điểm hay hành tỏi gọn gàng. Chọn bộ 2 hoặc 4 hộp.",
    material: "PET + ABS", sizes: "9,5 × 13,5 × 11 cm",
    variants: [
      { name: "Bộ 2 hộp", sku: "A1170-2", price: 96000, orig: 145000 },
      { name: "Bộ 4 hộp", sku: "A1170-4", price: 188000, orig: 290000 }
    ]
  },
  {
    id: "hop-khan-giay", cat: "decor", badge: "Dễ thương", g: 16,
    img: _p("hop-khan-giay", "01"),
    name: "Hộp đựng khăn giấy hình phao bơi",
    tag: "Phòng khách",
    desc: "Nhân vật phao bơi đáng yêu, có lò xo đẩy giấy bên trong. Chọn dáng ngồi 2 chân hoặc đứng 4 chân, màu kem / vàng.",
    material: "PET + ABS", sizes: "23,5 × 17 × 12 cm",
    variants: [
      { name: "Kem · dáng ngồi", sku: "DD2460-3", price: 192000, orig: 270000, vimg: 13 },
      { name: "Vàng · dáng ngồi", sku: "DD2460-4", price: 172000, orig: 240000, vimg: 10 },
      { name: "Kem · dáng đứng", sku: "DD2460-1", price: 206000, orig: 300000, vimg: 15 },
      { name: "Vàng · dáng đứng", sku: "DD2460-2", price: 186000, orig: 270000, vimg: 12 }
    ]
  },
  {
    id: "hop-giay-bi-ngo", cat: "decor", badge: "Dễ thương", g: 10,
    img: _p("hop-giay-bi-ngo", "01"),
    name: "Hộp giấy bí ngô mặt cười",
    tag: "Phòng khách",
    desc: "Tạo hình bí ngô mềm mại, miệng rút giấy viền bạc, lò xo đẩy giấy bên trong. Bản trơn hoặc bản trang trí tay chân.",
    material: "ABS", sizes: "22 × 14,5 × 12 cm",
    price: 78000, orig: 105000, sku: "D2261-1"
  },
  {
    id: "hop-giay-moai", cat: "decor", badge: "-38%", g: 12,
    img: _p("hop-giay-moai", "01"),
    name: "Hộp giấy tượng Moai (đầu tượng) trang trí",
    tag: "Phòng khách",
    desc: "Tạo hình tượng Moai độc đáo, rút giấy ngay phía trước, điểm nhấn cá tính cho bàn làm việc, phòng khách. Chất liệu nhựa ABS cao cấp.",
    material: "Nhựa ABS", sizes: "Kem · Xanh olive · Đen",
    variants: [
      { name: "Kem", sku: "MOAI-KEM", price: 136000, orig: 220000, vimg: 8 },
      { name: "Xanh olive", sku: "MOAI-OLIVE", price: 136000, orig: 220000, vimg: 3 },
      { name: "Đen", sku: "MOAI-DEN", price: 136000, orig: 220000, vimg: 10 }
    ]
  },
  {
    id: "tong-do-cat-toc", cat: "decor", badge: "Mới", g: 10,
    img: _p("tong-do-cat-toc", "01"),
    name: "Tông đơ cắt tóc không dây Hanori HN-809A",
    tag: "Thiết bị gia đình",
    desc: "Tông đơ không dây, màn hình hiển thị pin trên thân máy, lưỡi cắt điều chỉnh, kèm 4 cữ lược, sạc USB. Bộ phụ kiện đầy đủ.",
    material: "ABS + thép", sizes: "Bộ đầy đủ",
    price: 354000, sku: "HN-809A"
  },
  {
    id: "bo-phu-kien", cat: "decor", badge: "Mua kèm", g: 18,
    img: _p("bo-phu-kien", "01"),
    name: "Bộ phụ kiện trang trí (tay, chân, mắt)",
    tag: "Phụ kiện",
    note: "Mua kèm sản phẩm, không bán lẻ",
    desc: "Combo tay, chân, mắt, miệng và mẫu cua đỏ để tự trang trí thùng rác, hộp giấy… thêm nét vui. Dán theo ý thích.",
    material: "Nhựa + keo dán", sizes: "Nhiều combo",
    variants: [
      { name: "2 tay nhỏ + mắt", sku: "PJ-524-8", price: 34000, orig: 39000, vimg: 11 },
      { name: "2 tay 2 chân + mắt", sku: "PJ-524-4", price: 67000, orig: 77000, vimg: 7 },
      { name: "2 tay 4 chân + mắt (lớn)", sku: "PJ-524-3", price: 81000, orig: 94000, vimg: 2 },
      { name: "Cua đỏ (càng + mắt)", sku: "PJ-1097-1", price: 72000, orig: 85000, vimg: 12 }
    ]
  }
];
