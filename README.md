# Đảo Đèn Lồng — Ba hòn đảo · AI SDLC Lab Day 12

**Phiên bản:** Phase 3, **Test Contract v1.2** (TICKET-03 “Đèn cạn dầu”). Game 3D low-poly chạy trên browser, dùng Three.js / TypeScript / Vite và một Node.js core độc lập để chạy headless 60 tick/giây. Mây, người giữ đèn đội nón lá, phải bảo vệ ánh sáng của ba hòn đảo giữa biển mây.

**Demo video:** Chưa quay; đường dẫn video MP4 công khai sẽ được bổ sung khi phát hành bản cuối.

## Cài đặt và chạy game (tối đa 3 lệnh)

Yêu cầu: Node.js 24+ và npm trên Windows, macOS hoặc Linux.

```bash
npm --prefix web ci
npm --prefix web run build
npm --prefix web run dev
```

Mở địa chỉ Vite hiển thị trong terminal (thường `http://localhost:5173/`). Bản web tĩnh nằm tại `web/dist/` để có thể triển khai lên hosting web. Không cần Docker. Chế độ headless **không dùng GPU**.

## Nội dung ba đêm

| Đêm | Màn chơi | Đèn | Thời gian | Tối thiểu phải sáng ở bình minh |
|---|---|---:|---:|---:|
| 1 | Đảo Bến | 5 | 240 s | 3 |
| 2 | Đảo Cau (hai đảo và cầu tre) | 6 | 270 s | 4 |
| 3 | Đảo Chuông (ba tầng, dốc, gió) | 7 | 300 s | 5 |

**Luật Phase 3:** Không còn thắng ngay khi tất cả đèn sáng. Đèn tiêu hao 1 dầu/giây, có thể bị Bóng Mực hút thêm 5 dầu/giây mỗi con và bị tắt khi hết dầu. Chỉ thắng nếu Mây còn Ngọn Lửa **và** ít nhất 60% đèn còn sáng tại tick cuối lúc bình minh. Nếu hết máu trước đó, thua ngay. Đèn sáng yếu dưới 30 dầu sẽ mất vùng an toàn.

## Điều khiển

| Phím | Hành động |
|---|---|
| WASD / các phím mũi tên | Di chuyển tương đối với camera |
| Di chuyển chuột | Xoay camera tự động, không cần nhấn |
| Cuộn chuột | Thu phóng |
| Space | Nhảy |
| Shift | Lướt |
| E | Nạp vào đèn tắt, thắp lại hoặc châm dầu đèn đang sáng |
| Q | Tỏa Sáng đẩy lùi Bóng Mực |
| Esc / P | Tạm dừng / tiếp tục |

Menu có hướng dẫn của Ông Đăng, chuyển qua ba đêm, chơi lại khi thua, bảng cài đặt âm lượng, độ nhạy chuột và **Bảng màu dễ phân biệt** lưu tại `localStorage`. Chế độ màu dễ phân biệt đổi mắt/viền Bóng Mực sang xanh dương sáng, đổi cảnh báo thành trắng kèm biểu tượng ⚠; đèn tắt co nhỏ và có vết rách để nhận diện không cần dựa vào màu.

## Dầu đèn và sức chứa

- Đèn chưa từng thắp cần **10 đom đóm**. Đèn đã từng thắp nhưng tắt chỉ cần **5** để thắp lại. Khi đèn sáng/re-sáng, nhiên liệu đặt về **100**.
- Đèn sáng có thể châm dầu theo `used = min(carried, ceil((100 - fuel)/10))`; mỗi đom đóm châm thêm 10 dầu, không vượt 100.
- Giao diện hiển thị **thanh dầu**, nhấp nháy 1 Hz khi dưới 30. Bóng Mực có thể chuyển sang `drain` để hút dầu. Khi dầu xuống 0, đèn tắt, điểm nạp dở đặt lại 0 nhưng vẫn nhớ đã từng sáng.
- Dung lượng mang = `min(20, 10 + 2 × số lần thắp thành công trong đêm)`, bao gồm thắp lại; đặt lại vào đêm mới. Đèn được đặt sáng sẵn trong scenario không làm tăng dung lượng.

## Điểm số Phase 3

| Sự kiện | Điểm |
|---|---:|
| Mỗi đom đóm nạp vào đèn/châm dầu | +5 |
| Thắp đèn lần đầu | +100 |
| Thắp lại đèn | +40 |
| Tỏa Sáng trúng một Bóng Mực | +5 |
| Tỏa Sáng trúng Bóng Mực đang hút dầu | +15 (tổng, không cộng thêm +5) |
| Thắng ở bình minh | Mỗi đèn sáng: `50 + floor(fuel)`, mỗi Ngọn Lửa còn: +50 |

Không có thưởng thời gian. Tổng điểm hành trình là tổng điểm các đêm đã thắng. Lướt, Bùa Gió, Gió Lạc và các thông số Phase 2 còn hiệu lực nếu TICKET-03 không thay thế.

## Headless Test Contract v1.2

File `game.contract.json` đặt tại thư mục gốc. Lệnh chuẩn:

```bash
node web/src/headless.mjs --seed 42 --night 1 --ticks 600 --out night1.jsonl --snapshot-every 10
node web/src/headless.mjs --seed 42 --night 2 --scenario web/tests/scenarios/phase-3/drain.json --ticks 120 --out test.jsonl
node web/src/headless.mjs --seed 42 --night 3 --ticks 18000 --out night3.jsonl
```

- Hỗ trợ `--seed`, `--night 1|2|3`, `--scenario`, `--inputs`, `--ticks`, `--out`, `--snapshot-every` (mặc định 10).
- Mỗi bước mô phỏng là 1/60 giây. Tick 0 là snapshot trước input. Pause làm `tick` tăng nhưng `sim_tick` dừng; countdown và dầu cũng dừng.
- JSONL ghi `snapshot`, `event`, `end`. Snapshot đèn có `fuel` làm tròn 1 chữ số thập phân, `ever_lit`, `relit_count`; người chơi có `capacity`; Bóng Mực có trạng thái `drain`.
- Cùng seed/scenario/inputs tạo JSONL giống hệt. Chạy thành công thoát 0; tham số hoặc JSON input sai thoát 2.
- Cốt lõi v1.2 dùng **đơn vị nguyên 1/60 dầu**, tránh lỗi sai số và chênh lệch ngưỡng.

## Kiểm thử và tài liệu nộp

Tại thư mục gốc:

```bash
npm --prefix web test
npm --prefix web run build
node scripts/verify.mjs
```

Kiểm thử chạy thật: **41/41 pass** (22 test còn hiệu lực được cập nhật từ Phase 2 + 19 test Phase 3). Build Vite/TypeScript pass; verifier CLI kiểm tra determinism, các sự kiện quan trọng và 18.000 tick Đêm 3 dưới 30 giây. Hình ảnh render từ Chrome software WebGL đã được lưu. **Chưa khẳng định đã chơi thủ công hết cả ba đêm hoặc đo FPS bằng GPU thật.**

- [ADR-0003 — thay đổi mô hình đèn và luật thắng](docs/adr/0003-lantern-fuel-and-dawn.md)
- [CHANGELOG.md — breaking changes](CHANGELOG.md)
- [Phase 3 — bằng chứng test và ảnh](docs/proof/phase-3/README.md)
- [Phân tích Phase 2 (lịch sử)](docs/spec/phase-2.md)
- [Nhật ký dùng AI](docs/notes/ai-log.md)
- [AI harness](AGENTS.md), [CREDITS.md](CREDITS.md), [LICENSE](LICENSE)

## Sáng tạo của tôi

Mây low-poly đội nón lá treo đèn nhỏ, các đảo có rừng cây, đèn vàng cam với thanh nhiên liệu trên thế giới 3D, cảnh báo đèn yếu, Bóng Mực có mắt/viền và hiệu ứng, màn hình Ông Đăng và âm thanh tổng hợp bằng Web Audio. Đây là phần trình bày; **không có thực thể trang trí bổ sung trong mô phỏng headless**.

Để xem ví dụ trực quan của đèn yếu/đèn đầy/đèn tắt mà không ảnh hưởng game bình thường, mở `http://localhost:5173/?autoplay=1&visual-proof=1`; tham số này chỉ là chế độ dựng scenario chứng cứ trong browser, không làm thay đổi Test Contract CLI.

## Tài liệu gốc

[GUIDE.md](GUIDE.md) · [CHECKPOINTS.md](CHECKPOINTS.md) · [SUBMISSION.md](SUBMISSION.md) · [RUBRIC.md](RUBRIC.md) · [RULES.md](RULES.md). Ticket được phát hành qua [lab board Đảo Đèn Lồng](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW).

Lịch sử Git: `phase-1` là v1.0, `phase-2` là v1.1, `phase-3` là v1.2.
