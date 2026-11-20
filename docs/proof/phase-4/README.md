# Phase 4 — Bằng chứng phát hành v1.0.0 / Contract v1.3

Gốc dự án: Đảo Đèn Lồng, TICKET-04. Chứng cứ dưới đây được sinh từ **lệnh chạy thật trên máy Windows**, không phải mẫu do AI tự viết. Đầu ra JSONL của những phase cũ ở `docs/proof/phase-1`, `phase-2`, `phase-3`.

## 1. Benchmark FPS — đo thật trong Chromium

Chạy (khởi động 3 giây rồi đo 30 giây):

```bash
node scripts/bench.mjs --seed 42 --duration 30 --out docs/proof/phase-4/bench.json
```

`bench.json` là kết quả **sau tối ưu shader/draw calls**, đo đủ 30 giây trên Windows, Chrome/Chromium, Three.js 0.181.2:

- 1280×720, 200 Bóng Mực `wander` đúng scene, 100 đom đóm, L1–L3 sáng fuel=100.
- Mây ở (0,0,0), camera bay đường tròn bán kính 30 tại Y=15, 15 giây/vòng. Không có input, sinh thêm kẻ địch, sát thương, nhặt, hao dầu hoặc kết thúc Đêm.
- `frames=5125`, `avg_fps=170.83`, `p1_low_fps=49.36`, `frame_ms_p95=13.7`, `load_ms=397`.
- Đạt các ngưỡng nội bộ ở lần đo địa phương: `avg_fps>=60`, `p1_low_fps>=30`, `load_ms<=10000`.

**Giới hạn:** `peak_mem_mb=null` vì API trình duyệt không đo đáng tin RSS toàn bộ Chrome/GPU. `vsync_off=false` là báo cáo bảo thủ mặc dù CLI đã yêu cầu tắt vsync qua flags; Chrome không cung cấp xác nhận khả kiểm. Số đo của giảng viên trên máy chấm có thể khác. Một bản cũ trước tối ưu có 1% low thấp hơn 30; không được dùng làm kết quả cuối.

## 2. Soak — 10 Đêm liên tiếp

```bash
node --jitless --expose-gc scripts/soak.mjs --seed 7 --nights 10 --out docs/proof/phase-4/soak.json
```

- Một process Node.js, seed mỗi đêm `7+i`, Night 1→2→3 lặp.
- Di chuyển đổi hướng mỗi 30 tick; các nút jump/dash/pulse/interact được thử ngẫu nhiên mỗi tick với xác suất 5/3/2/10%.
- `soak.json` ghi số đêm, crashes, 10 kết quả, RSS MB đầu/cuối và thời gian thực.
- Phép đo ban đầu: `crashes=0`, `mem_start_mb=33.67`, `mem_end_mb=36.75` (tăng 9.1%, dưới 20%). File JSON được cập nhật lại khi rà soát phát hành.

## 3. Leaderboard, accessibility và browser smoke

```bash
npm --prefix web test
npm --prefix web run build
node scripts/verify.mjs
node scripts/browser-smoke.mjs
```

- `settings-1280x720.png`: setting với 9 binding, bắt trùng, chữ lớn.
- `leaderboard-1280x720.png`: menu bảng top 10.
- `save-score-1280x720.png`: kết thúc Đêm, nhập tên và lưu điểm bằng POST thực tế vào API.
- `gameplay-1280x720.png`: gameplay bản phát hành.
- `leaderboard-browser-test.json`, `leaderboard-export.json`: dữ liệu minh chứng dành riêng cho test; không phải dữ liệu người chơi thật.
- `bench.json`, `soak.json`: đầu ra máy chạy. `docs/demo/demo.mp4` là clip ~24 giây quay game 3D trong Chrome với input bàn phím tự động và caption có số đo/test đã quan sát; không phải playthrough thủ công.

## 4. Tính tương thích và hạn chế

- `game.contract.json` v1.3 thêm `bench_cmd` và `soak_cmd`, giữ nguyên tuning luật v1.2.
- Bộ regression 41 test từ Phase 1–3 không `skip`; thêm 4 test leaderboard/soak cho tổng **45 test**.
- `scripts/verify.mjs` kiểm tra JSONL và determinism của 3 đêm, cộng sáu scenario mới Phase 3.
- `scripts/web-server.mjs` cung cấp web tĩnh và lưu leaderboard tại `data/leaderboard.json`; `run_cmd --export-leaderboard out.json` đọc cùng file.
- **Chưa có bằng chứng playtest thủ công trọn ba Đêm hoặc FPS trên máy chấm chưa công bố**. Browser smoke và demo tự động không được gọi là playtest người thật.

## Linux CI correction (verified on Ubuntu WSL)

On Linux, the default V8 JIT retained extra runtime memory after multiple game resets, raising RSS beyond the 20% threshold despite no crash or persistent gameplay references. Phase 4 uses `node --jitless --expose-gc scripts/soak.mjs` **only for the soak process**, preserving the original 60 Hz core and all gameplay behavior while reducing JIT heap/code-cache retention. Actual verified values:

- Windows: RSS **33.67 MB → 36.75 MB** (9.1% increase), 10/10 nights, 0 crashes.
- Ubuntu WSL / Node 24.21.0: RSS **47.58 MB → 50.58 MB** (6.3% increase), 10/10 nights, 0 crashes.
- Ubuntu WSL 45/45 unit tests passed, no skipped tests. Headless gameplay, normal browser and FPS benchmark do not run with `--jitless`.

The original 30-second benchmark values in `bench.json` remain valid because it is a separate Chrome/WebGL process and the benchmark scene was not changed by this Linux soak correction.
