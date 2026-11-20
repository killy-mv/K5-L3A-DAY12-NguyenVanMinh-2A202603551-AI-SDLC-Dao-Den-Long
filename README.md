# Đảo Đèn Lồng — Đêm 1 · Day 12 AI SDLC

**Demo video:** Chưa quay — sẽ bổ sung đường dẫn công khai khi hoàn tất kiểm thử và phát hành.

Game 3D low-poly cổ tích: điều khiển Mây, nhặt đom đóm, thắp 5 Đèn Lồng Lớn, tránh Bóng Mực và tỏa sáng để xua chúng đi. Thắp hết đèn thì thắng, mất hết máu hoặc hết đêm thì thua. Nhấn chơi lại sau khi kết thúc.

**Công nghệ:** Three.js + TypeScript + Vite cho browser; Node.js ES modules cho mô phỏng headless 60 tick/giây. Engine gameplay dùng chung trong `web/src/core/game.js`, không phụ thuộc renderer.

## Chạy game (macOS/Linux/Windows, tối đa 3 lệnh)

Yêu cầu: Node.js 24+ và npm.

```bash
npm --prefix web ci
npm --prefix web run build
npm --prefix web run dev
```

Mở địa chỉ Vite hiển thị trên terminal (mặc định http://localhost:5173). Build web tĩnh ở `web/dist/` để triển khai trên hosting web; không cần Docker hoặc GPU để chạy headless.

## Điều khiển

| Phím | Hành động |
|---|---|
| W A S D / phím mũi tên | Đi lại, tương đối với hướng camera |
| Kéo chuột | Xoay camera |
| Cuộn chuột | Thu/phóng camera |
| Space | Nhảy |
| E | Nạp đom đóm vào Đèn Lồng gần nhất (nhấn mới) |
| Q | Tỏa sáng, tiêu hao 2 đom đóm (nhấn mới) |
| R | Chơi lại khi thắng/thua |

## Cách tính điểm và thông số giả định

- Nhặt mỗi đom đóm: +10 điểm; chứa tối đa 8.
- Mỗi đèn cần 5 đom đóm để sáng, có thể nạp dần; thắp sáng: +100 điểm.
- Tỏa sáng trong bán kính 5m: 2 đom đóm, làm choáng Bóng Mực 2.5s, đẩy 2.8m, +25 điểm mỗi con trúng.
- Trúng Bóng Mực: mất 1 máu; có 1.5s bất tử, đánh rơi 50% lượng đang mang (làm tròn xuống); đèn đã sáng tạo vùng an toàn 4m.
- Thắng: thêm `floor(số giây còn lại) × 2 + số máu còn lại × 50` điểm.
- Thua: hết máu hoặc hết 300 giây; không có phạt rơi khỏi đảo, nhân vật bị giới hạn tại mép đảo.
- Tốc độ Mây: 6m/s, Bóng Mực: 2.2m/s; khoảng cách tương tác 3m, nhặt 1.2m.
- Các giá trị chính xác đặt tại `game.contract.json`; giải thích giả định: `docs/notes/assumptions.md`.

## Test Contract v1.0 — headless

`game.contract.json` nằm ở thư mục gốc, với `build_cmd`, `run_cmd`, `headless_cmd`, `tuning` chính xác.

```bash
node web/src/headless.mjs --seed 42 --night 1 --ticks 120 --out output.jsonl
node web/src/headless.mjs --seed 42 --night 1 --scenario web/tests/scenarios/pickup.json --inputs web/tests/scenarios/move.json --ticks 120 --out output.jsonl --snapshot-every 10
npm --prefix web test
```

- Tick 0 là trạng thái ngay sau dựng scenario, trước input; frame tick k tác động lên trạng thái k+1.
- Mỗi bước chính xác 1/60s; khi thắng/thua chương trình dừng sớm.
- Đầu ra JSONL có snapshot định kỳ, event và dòng `end` bắt buộc.
- Tham số/file scenario/input sai: thoát mã 2 với thông báo stderr; chạy thành công mã 0.
- Input giữ giá trị qua frame, nút kích hoạt cạnh false→true, di chuyển theo yaw với normalize; cùng seed, scenario, inputs cho JSONL giống hệt.
- Chạy `node scripts/verify.mjs` để kiểm tra tính tất định đầu-cuối (trong thư mục gốc).
- Bằng chứng từng yêu cầu: `docs/proof/phase-1/`.

## Sáng tạo của tôi

- Mây được tạo từ hình học low-poly, đội nón lá và mang một đèn lồng nhỏ.
- Đảo nổi trên biển mây với lối đi, rừng cây cách điệu, đèn đổi màu và chiếu sáng vàng cam khi được thắp.
- Đom đóm lơ lửng với quầng sáng, Bóng Mực tím đen có đôi mắt sáng, vòng sáng khi tỏa năng lượng, HUD và thông báo trực quan.
- Toàn bộ hiệu ứng trên thuộc renderer và **không tạo thực thể headless bổ sung**; kiểm tra logic riêng bằng `npm --prefix web test`.

## Quy trình AI SDLC và bằng chứng

- AI harness: `AGENTS.md`, test tự động, `scripts/verify.mjs`, GitHub Actions.
- Ghi giả định: `docs/notes/assumptions.md`; nhật ký dùng AI: `docs/notes/ai-log.md`.
- Bằng chứng: `docs/proof/phase-1/README.md`; nguồn asset và giấy phép: `CREDITS.md` và `LICENSE`.
- Chưa tự gắn tag `phase-1` hoặc tạo Release; chỉ tag sau khi nghiệm thu.

## Tài liệu bài lab gốc

[GUIDE.md](GUIDE.md) · [CHECKPOINTS.md](CHECKPOINTS.md) · [SUBMISSION.md](SUBMISSION.md) · [RUBRIC.md](RUBRIC.md) · [RULES.md](RULES.md)

Yêu cầu các phase mới: [Lab Board](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW). Mỗi phase cần tag riêng và bằng chứng đúng với commit đó. Repo cá nhân phải public khi nộp.
