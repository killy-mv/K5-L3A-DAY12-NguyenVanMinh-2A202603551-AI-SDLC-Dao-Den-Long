# Retro — Day 12 AI SDLC: bốn Phase đến v1.0.0

**Ngày:** 20/11/2026  
**Dự án:** Đảo Đèn Lồng — Three.js, headless Node.js, CI, GitHub Release  
**Vai trò:** Phát triển cá nhân với AI hỗ trợ thiết kế, code, kiểm thử và tài liệu.

## 1. Kết quả Evaluation theo bốn Phase

| Phase | Giá trị chính | Bằng chứng và mức độ hoàn thành |
|---|---|---|
| **1 — PRD-0** | Một Đêm chơi được, Mây di chuyển/nhảy/nhặt đom đóm/nạp đèn, Bóng Mực, Tỏa Sáng, thắng-thua, HUD. Tạo lõi mô phỏng 60Hz và JSONL Test Contract v1.0. | Tag `phase-1`, Node headless CLI và scenario/JSONL. Bản đầu chỉ tập trung hành vi yêu cầu, chưa phải sản phẩm tối ưu. |
| **2 — TICKET-02** | Ba bản đồ, dash, Bùa Gió, Gió Lạc, gió mạnh, pause/menu, chuẩn hóa mọi giá trị v1.1. Bổ sung UI low-poly, camera và âm thanh. | Tag `phase-2`, 22 test và chứng cứ màn hình/headless. Lỗi mặt đất và camera/tầng cao được phát hiện trong thử render thực tế và sửa sau. |
| **3 — TICKET-03** | Thay luật thắng ngay bằng bảo vệ đủ đèn đến bình minh; thêm nhiên liệu, châm dầu, thắp lại, Bóng Mực hút dầu, điểm mới và dung lượng thay đổi. | Tag `phase-3`, 41 test (gồm 19 test mới), ADR-0003, changelog, scenario chứng minh các event. Lõi dầu dùng số nguyên 1/60 để không bị sai số tick. |
| **4 — TICKET-04** | Đóng gói web, chạy benchmark FPS thực, soak 10 đêm, top-10 lưu đĩa và export, đổi phím, chữ lớn, giảm chuyển động, phụ đề, retro và MP4. | `docs/proof/phase-4/`, 45 unit/regression tests, Chrome smoke, video demo và workflow Release. Benchmark sau tối ưu: 170,83 FPS trung bình, 49,36 FPS 1% low, tải 397 ms; soak không crash, RSS tăng ~9,1%. |

Các con số FPS này là phép đo trên máy thực hiện của tôi, không phải máy chấm. Web benchmark không đo được RSS Chrome một cách đáng tin cậy (`peak_mem_mb=null`); việc đã yêu cầu tắt vsync không có nghĩa biết chắc trình duyệt thật sự tắt (`vsync_off=false`).

## 2. Điều gì hiệu quả khi làm với AI?

**Chia core / presentation / hợp đồng test ngay từ đầu** là quyết định có ích nhất. Ở Phase 3, luật thắng và quản lý nhiên liệu thay đổi sâu, nhưng không cần viết lại renderer hoặc công cụ kiểm tra JSONL. AI có thể chỉnh core, chạy unit test và đối chiếu từng sự kiện mà không phụ thuộc GPU. Cơ chế log lỗi, test scenario nhỏ và build TypeScript sau mỗi cụm sửa khiến lỗi xuất hiện sớm thay vì tích tụ.

**Không làm mọi tính năng trong một lần gọi**. Quy trình tốt hơn là: đọc ticket; liệt kê điều kiện thay thế; đổi luật lõi; chạy regression; thêm test tương ứng; dựng giao diện; render/benchmark; xuất bằng chứng; viết tài liệu/commit. Khi rủi ro cao, tôi dùng scenario cô lập và kiểm tra JSONL byte-for-byte với seed giống nhau.

**Bash 2.0 + Node verifier** giúp hơn các bản mô tả thuần văn bản: công cụ có thể chạy trên máy Windows của tôi, kiểm tra lệnh thực, build thật, chụp Chrome thật và lưu kết quả. `AGENTS.md`, `scripts/verify.mjs`, GitHub Actions và `web/tests/` là harness hữu dụng nhất.

## 3. AI sai ở đâu, tôi phát hiện và sửa thế nào?

1. **Đồ họa Phase 2:** nền đảo trùng mặt phẳng tạo Z-fighting, camera xuyên tầng cao Đảo Chuông. Unit test không bắt lỗi render; ảnh Chrome 1280×720 phát hiện, sau đó sửa hình học và camera.
2. **Sai field nhiên liệu Phase 3:** AI dùng `l.fuel` trong renderer, trong khi core lưu `fuelUnits`. Ảnh cho thấy thanh dầu trống; sửa thành `fuelUnits/60` và chụp lại.
3. **Regression cũ không phù hợp Phase 3:** test vẫn chờ thắng sớm hoặc điểm thưởng thời gian. Đọc kỹ TICKET-03, chỉ sửa các assertion bị luật mới thay thế và ghi breaking changes, không `skip` âm thầm.
4. **Benchmark suýt bị tuyên bố đạt khi chưa đủ:** ở Phase 4, phép thử ngắn chưa phải kết quả chuẩn, và phép đo đầu đủ 30 giây chỉ đạt 1% low 28,89 FPS (dưới ngưỡng 30). Sau khi xác định shader/draw-call của 200 Bóng Mực là điểm nghẽn, tôi gộp hai mắt thành một geometry và bốn xúc tu thành một geometry, áp dụng cho **cả gameplay lẫn benchmark**. Đo lại đủ 30 giây được avg 170,83 FPS, 1% low 49,36 FPS, p95 13,7ms. Không dùng số đo thử để khai thành tích.
5. **Sai lẫn throughput và FPS:** Node có thể chạy 18.000 tick rất nhanh, nhưng đó không phải tốc độ render GPU. Benchmark lấy khoảng thời gian khung hình thật từ Chrome; `load_ms` tính từ tiến trình tới khung đầu, không suy từ headless.

Tôi rút ra rằng AI viết code rất nhanh nhưng cần kiểm chứng **độc lập bằng thực thi, ảnh quan sát, regression test và số đo**.

## 4. Token, chi phí và cách tiết kiệm

Không có usage log từ ChatGPT/Bash 2.0 theo từng lời gọi, nên **không thể báo tổng token hoặc chi phí API chính xác**. Ước lượng cực thô dựa trên quy mô nhiều lượt đọc repo, sinh code, test và debug là hàng trăm nghìn token cho cả bốn phase; mức bất định lớn và **không phải thống kê thanh toán**. Game không gọi API AI trả phí khi chạy, nên chi phí API vận hành riêng từ game là 0; nếu có phí ChatGPT thuê bao thì không thể phân bổ đáng tin cậy theo project này.

Tôi tiết kiệm token bằng cách tái sử dụng cấu trúc từ phase trước, chỉ đọc file/đoạn liên quan, dùng scenario/test cụ thể trước khi hỏi AI sửa, không thử rewrite toàn bộ sau mỗi change request, chạy smoke benchmark 3–5 giây trước khi chạy 30 giây chuẩn, lưu log JSONL và screenshot thật để không phải giải thích lại tình trạng nhiều lần.

## 5. Nếu làm lại

Tôi sẽ viết các contract test và evidence tự động từ Phase 1, bổ sung screenshot test ở nhiều góc camera từ sớm và benchmark với nhiều Bóng Mực ngay ở Phase 2 thay vì đợi đến Phase 4. Tôi cũng sẽ thiết kế renderer theo hướng batching/instancing sớm và quyết định rõ một nguồn lưu leaderboard duy nhất (server địa phương vs localStorage). Trước nộp chính thức, vẫn cần playtest bằng người chơi qua tất cả ba đêm, đo FPS trên máy chấm khi được công bố và kiểm tra UX với người khác.

**Kết luận:** việc có CI, seed determinism, FPS từ Chrome, soak RSS, test leaderboard và MP4 giúp đưa game từ “agent báo chạy được” thành sản phẩm có chứng cứ. Nhưng automation không thay thế hoàn toàn kiểm thử trải nghiệm bằng người thật.
