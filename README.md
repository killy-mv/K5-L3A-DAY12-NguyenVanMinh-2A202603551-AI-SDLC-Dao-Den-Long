# Đảo Đèn Lồng — AI SDLC · 3 Đêm (Phase 2)

**Demo video:** Chưa quay; sẽ gắn link video MP4 công khai tại đây trước bản phát hành cuối cùng.

Game 3D cổ tích, góc nhìn thứ ba, viết bằng **Three.js + TypeScript + Vite**. Mây phải mang đom đóm tới các Đèn Lồng Lớn, xua Bóng Mực và sống sót qua ba đêm:

- **Đêm 1 — Đảo Bến:** đảo tròn bán kính 40 m, 5 đèn.
- **Đêm 2 — Đảo Cau:** hai đảo nối bằng cầu tre, bục nhảy, Bùa Gió và Gió Lạc, 6 đèn.
- **Đêm 3 — Đảo Chuông:** ba tầng, dốc, bục nhảy, tháp chuông và gió mạnh, 7 đèn.

**Phase 2:** Contract v1.1 và Ticket-02 chuẩn hóa toàn bộ thông số, thay thế các con số tự chọn ở Phase 1. Bản Phase 1 vẫn được bảo lưu tại Git tag `phase-1`.

## Cài đặt và chơi (3 lệnh)

Yêu cầu: Node.js 24+ và npm; bản web dùng được trên macOS, Linux hoặc Windows.

```bash
npm --prefix web ci
npm --prefix web run build
npm --prefix web run dev
```

Mở địa chỉ Vite trả về (thường là `http://localhost:5173/`). Bản web tĩnh để phát hành được sinh trong `web/dist/` sau build.

## Điều khiển

| Phím hoặc chuột | Hành động |
|---|---|
| WASD hoặc mũi tên | Chạy theo góc nhìn camera |
| Di chuyển chuột (không cần giữ nút) | Xoay camera ngang |
| Cuộn chuột | Thu/phóng camera |
| Space | Nhảy |
| Shift | Lướt 14m/s trong 0.2s |
| E | Nạp đom đóm cho một đèn gần nhất |
| Q | Tỏa Sáng đẩy lùi Bóng Mực và Gió Lạc |
| Esc hoặc P | Tạm dừng / tiếp tục |

Menu: chọn Bắt đầu → lời giới thiệu Ông Đăng → chơi → thắng để sang Đêm kế tiếp. Thua có thể chơi lại đúng Đêm đó; thắng Đêm 3 sẽ hiện màn hình Bình Minh và tổng điểm. Trong menu tạm dừng có Tiếp tục, Chơi lại, Cài đặt, Về menu. Âm lượng và độ nhạy chuột lưu tại `localStorage`.

## Cách tính điểm (chuẩn hóa)

- **+10** cho mỗi đom đóm **nạp vào đèn** (nhặt từ mặt đất không cộng điểm).
- **+100** khi thắp sáng hoàn toàn một đèn.
- **+5** mỗi lần Tỏa Sáng trúng một Bóng Mực, kể cả khi đang choáng.
- **Điểm thưởng thắng Đêm** = `floor(giây còn lại) × 2 + 50 × số Ngọn Lửa còn lại`.
- Tổng điểm cuối game = tổng điểm của các Đêm đã thắng.

Giới hạn mang 10 đom đóm; mỗi đèn cần 10. Tỏa Sáng tốn 3 đom đóm, bán kính 5m, hồi chiêu 3 giây. Lướt hồi chiêu 1.5s, Bùa Gió cho chạy 7.2m/s và lướt không hồi chiêu 10 giây. Bị đánh mất một Ngọn Lửa (có 3), đom đóm đánh rơi; hết máu hoặc hết thời gian là thua.

Đầy đủ thông số tiêu chuẩn nằm trong `game.contract.json` và `web/src/core/game-v11.js`. Riêng Bóng Mực ở Đêm 3 chạy 4.5m/s thay vì 4m/s.

## Headless / Test Contract v1.1

Game mô phỏng **60 tick/giây cố định** và có thể chạy không GPU/không giao diện với Node.js. Core gameplay được dùng chung bởi renderer Three.js và CLI, không chứa DOM hay WebGL.

```bash
node web/src/headless.mjs --seed 42 --night 1 --ticks 600 --out night1.jsonl --snapshot-every 10
node web/src/headless.mjs --seed 42 --night 2 --scenario web/tests/scenarios/phase-2/charm-scenario.json --inputs web/tests/scenarios/phase-2/charm-inputs.json --ticks 120 --out night2.jsonl
node web/src/headless.mjs --seed 42 --night 3 --ticks 21600 --out night3.jsonl
```

- `--night` nhận 1, 2, 3. File `--scenario`, `--inputs` tùy chọn; `--snapshot-every` mặc định 10.
- Kết quả `.jsonl` gồm `snapshot`, `event` và dòng cuối `end`.
- Snapshot tick 0 ngay sau dựng scenario, trước input; input tick k tác động trạng thái k+1; khi tạm dừng `tick` tăng còn `sim_tick` đứng yên.
- Với seed/scenario/inputs giống nhau, đầu ra giống nhau từng byte.
- Thoát mã 0 khi thành công, 2 nếu tham số / file JSON input sai.
- `game.contract.json` ở gốc có lệnh `build_cmd`, `run_cmd`, `headless_cmd` và `tuning` chính xác.

## Kiểm thử và bằng chứng

Chạy từ thư mục gốc:

```bash
npm --prefix web test
npm --prefix web run build
node scripts/verify.mjs
```

Bằng chứng Phase 2: `docs/proof/phase-2/`, bao gồm JSONL từ các scenario mới, ảnh Chrome thực tế Đêm 2–3, và báo cáo kiểm chứng. Danh sách tiêu chí nghiệm thu và trạng thái từng phần: `docs/spec/phase-2.md`.

Tại lần kiểm tra đã ghi nhận: 22/22 test đạt; TypeScript/Vite build thành công; ba Đêm cho output tất định; 21.600 tick Đêm 3 hoàn thành trong khoảng 160ms trên Windows/Node 24. **Chưa kiểm chứng end-to-end cả 3 đêm bằng thao tác người chơi và chưa đo được FPS bằng GPU vật lý.** Chỉ chứng minh browser render qua Chrome software WebGL, không giả định đó là benchmark FPS thực tế.

AI harness: `AGENTS.md`, `scripts/verify.mjs`, `.github/workflows/test.yml`. Ghi chép các giả định và nhật ký AI: `docs/notes/`; tài sản/giấy phép: `CREDITS.md` và `LICENSE`.

## Sáng tạo của tôi

- Mây low-poly đội nón lá có đèn lồng nhỏ treo trên nón.
- Ba hòn đảo có phong cách cổ tích, đom đóm phát quầng sáng, đèn chuyển sang vàng cam khi thắp, Bóng Mực tím đen.
- HUD có gợi ý đèn, kỹ năng, thông báo và menu Ông Đăng; nhạc nền và hiệu ứng âm thanh được tổng hợp bằng Web Audio không cần file âm thanh ngoài.
- Tất cả bổ sung đồ họa, âm thanh, giao diện không đưa thêm thực thể vào mô phỏng headless, không thay đổi Test Contract.

## Các tài liệu gốc của lab

[GUIDE.md](GUIDE.md) · [CHECKPOINTS.md](CHECKPOINTS.md) · [SUBMISSION.md](SUBMISSION.md) · [RUBRIC.md](RUBRIC.md) · [RULES.md](RULES.md)

Lab board: [Đảo Đèn Lồng](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW). Sau Phase 2 cần tag `phase-2`; các ticket sau có thể đổi luật chơi và buộc chạy lại regression.
