# Đảo Đèn Lồng — v1.0.0 “Bình minh”

Game 3D low-poly Three.js ba đêm. Phiên bản phát hành theo **Test Contract v1.3** và **TICKET-04**.

## Chơi game

Tải `dao-den-long-v1.0.0-web.zip`, giải nén và chạy `node scripts/run.mjs` bằng Node.js 24+. Mở `http://127.0.0.1:4173`.

## Tính năng

- Ba hòn đảo với đèn cạn dầu, châm dầu, thắp lại, Bóng Mực hút nhiên liệu và sống sót tới bình minh.
- Bảng xếp hạng top 10 lưu trên đĩa, hỗ trợ xuất JSON.
- Tự đổi 9 phím, cảnh báo trùng, giảm chuyển động, phóng to chữ và bảng màu dễ phân biệt.
- Chế độ benchmark 1280×720 với 200 Bóng Mực, 100 đom đóm, camera bay 15 s/vòng; soak test 10 đêm.
- CLI headless deterministic 60 Hz và bộ kiểm thử hồi quy từ 4 phase.

## Bằng chứng

Trong repo: `docs/proof/phase-4/bench.json`, `soak.json` và kiểm thử tự động. MP4 demo đính kèm Release. Kết quả benchmark máy cá nhân chỉ tham khảo, không thay thế phép đo trên máy chấm.

## Hệ thống

Windows/macOS/Linux, Node.js 24+, trình duyệt Chrome/Edge hỗ trợ WebGL 2. Không cần Docker, database hay GPU cho headless/soak.
