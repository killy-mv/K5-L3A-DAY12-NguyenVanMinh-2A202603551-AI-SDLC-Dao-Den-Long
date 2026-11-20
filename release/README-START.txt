ĐẢO ĐÈN LỒNG — Release v1.0.0 / Phase 4
=======================================
1. Cài đặt Node.js 24 trở lên (Windows, macOS hoặc Linux).
2. Giải nén toàn bộ file ZIP, giữ cấu trúc web/dist/ và scripts/.
3. Trong thư mục vừa giải nén, chạy:
      node scripts/run.mjs
4. Mở http://127.0.0.1:4173 trong Chrome hoặc Edge.

Bảng xếp hạng được lưu trên đĩa tại data/leaderboard.json.
Để xuất:
      node scripts/run.mjs --export-leaderboard leaderboard-export.json

Có thể chạy web/dist/ trên bất kỳ máy chủ web tĩnh nào nhưng bản đó chỉ
lưu leaderboard trong localStorage và không thể xuất qua lệnh Node.
Để có export/leaderboard đầy đủ, hãy chạy server Node như phía trên.

Nguồn có đủ headless, benchmark và soak test ở GitHub repo.
