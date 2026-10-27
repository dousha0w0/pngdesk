# pngdesk

**把 PNG 丢进来，拿更小的版本。** pngdesk 是 [pngdeer](https://github.com/heydeer/pngdeer) 的 WebAssembly 构建套上
[DriveDesk](https://github.com/dousha0w0/drivedesk) 那套工作台外壳：设计变量、双布局、可拖拽面板、虚拟表格、标签式详情面板。
压缩全程在本机完成，图片不上传，站点可以整个放在 Cloudflare Workers 上。

- **质量按图挑选**：pngdeer 在 2–256 色调色板之间搜索，用 SSIMULACRA2 打分，留下最小的那个文件，自动模式复刻命令行行为（不超过 90 分）。
- **同一个二进制**：浏览器和命令行跑的是同一份 Rust 代码，产物一致。
- **多线程**：跨源隔离（COOP/COEP）下用共享内存的 rayon 版本，一张图吃满所有核；没有隔离头时退化为多个单线程 Worker，一文件一个。
- **大图**：单张上限 40 MP（与 pngdeer 网页版一致），超出会明确拒绝，而不是把标签页跑挂。
- **不上传**：没有后端逻辑，Worker 只做静态资源分发和响应头。

## 界面

沿用 DriveDesk 的设计语言，不引入第二套视觉：

| 部分 | 作用 |
| --- | --- |
| 工具栏 | 添加文件/文件夹、筛选、下载所选、活动坞与详情面板开关、设置 |
| 侧栏 | 队列视图（全部/进行中/已完成/失败）、质量目标、全尺寸搜索、并行 Worker、本批节省合计 |
| 队列条 | 当前视图面包屑、质量与压缩模式标签、重新压缩、全部下载 |
| 文件表格 | 名称/原始/压缩后/节省/SSIMULACRA2/状态，虚拟滚动、多选、列排序 |
| 活动坞 | 每个文件的耗时、压缩比、吞吐，可拖高、可折叠 |
| 详情面板 | 「对比」前后滑动对比（缩放/背景/像素对齐）与「报告」（目标、评分、候选数、调色板、耗时分布） |
| 状态栏 | 文件数、已节省、共享内存状态、Worker 模式、版本 |

外观可切换：浅色/深色/跟随系统 × 中性/石墨/VS Code × 三种圆角 × 两档行密度 × 经典/分离布局，中英双语，全部持久化在 `localStorage`。

## 开发

```sh
pnpm install
pnpm dev          # http://localhost:1410，已带 COOP/COEP 头，多线程构建可用
pnpm build        # vue-tsc 类型检查 + vite build 到 dist/
pnpm dev:worker   # 构建后用 wrangler dev 跑真实的 Worker + 静态资源
```

## 重新构建 pngdeer 的 WebAssembly

`public/pngdeer/` 里的产物由脚本生成，不手工维护：

```sh
brew install llvm
cargo install wasm-bindgen-cli --version 0.2.129 --locked
rustup target add wasm32-unknown-unknown
rustup toolchain install nightly --component rust-src
rustup target add wasm32-unknown-unknown --toolchain nightly
sh scripts/build-pngdeer.sh            # 可选参数：pngdeer 的 commit
```

脚本会克隆 `heydeer/pngdeer` 到 `.cache/pngdeer`（固定在 `scripts/build-pngdeer.sh` 里的 commit），按上游
`web/build.sh` 的方式编译单线程与线程版，把 `worker.js`、`LICENSE`、`THIRD_PARTY_LICENSES.txt` 一并放进去，
并写下 `BUILD.txt`（commit、构建时间、产物 SHA-256）。macOS 上 Homebrew 的 `opt/llvm` 软链偶尔残缺，脚本会回退到 Cellar 路径。

## GitHub Pages（预览）

Pages 只有静态文件，设不了 `COOP`/`COEP`：页面不是跨源隔离的，于是自动用单线程 Worker 池而不是共享内存版本。
产物完全一致，只是并行方式不同，状态栏会标注「无共享内存 / Worker ×4」。

`.github/workflows/pages.yml` 在 `main` 上构建并发布 `dist/`（仓库 Settings → Pages → Source 选 GitHub Actions）。
构建用相对路径（`base: "./"`），所以同一份 `dist/` 既能放在域名根（Workers），也能放在 `/<repo>/`（Pages）下。

在线预览：<https://dousha0w0.github.io/pngdesk/>（首次部署后生效）

想要多线程，就部署到 Cloudflare Workers：

## 部署到 Cloudflare Workers

```sh
pnpm dlx wrangler login
pnpm deploy
```

`wrangler.jsonc` 用 Workers 静态资源托管 `dist/`：

```jsonc
{
  "main": "src/worker.ts",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": true
  }
}
```

`src/worker.ts` 只做两件事：

1. 把请求交给 `env.ASSETS.fetch()`；
2. 在响应上加 `Cross-Origin-Opener-Policy: same-origin` 与 `Cross-Origin-Embedder-Policy: require-corp`。

第二条是重点：`SharedArrayBuffer` 只在跨源隔离的页面可用，而 Workers 静态资源本身不能设置响应头，所以需要 Worker 先接住每个请求
（`run_worker_first`）。缺了这两个头，页面不会崩，只会自动退化成多个单线程 Worker，并在状态栏标出「无共享内存」。

`/assets/*` 是 Vite 的哈希产物，按一年不可变缓存；`/pngdeer/*` 一天；其余保持资产服务器的默认行为。

## 结构

```
src/
  App.vue                 外壳：工具栏 / 双布局 / 可拖拽面板 / 快捷键 / 拖放
  worker.ts               Cloudflare Worker：静态资源 + 隔离头 + 缓存
  components/layout/      工具栏、侧栏、队列条、虚拟表格、活动坞、详情面板、状态栏
  components/ui/          按钮、图标、分段控件、开关、弹窗、提示
  stores/queue.ts         任务队列、选择、排序、统计、下载、重新压缩
  lib/pool.ts             pngdeer Worker 池：线程版自检、退化、排队
  lib/prefs.ts            外观与压缩偏好（localStorage）
  styles/tokens.css       与 DriveDesk 相同的设计变量
public/
  pngdeer/                pngdeer 的 wasm 产物、worker.js、许可证、BUILD.txt
  samples/                示例图（来源与许可见 SOURCES.md）
scripts/build-pngdeer.sh  重建 wasm
```

## 已知边界

- 单张 40 MP 上限由 pngdeer 网页版定下（wasm32 的 4 GB 地址空间），超出会在排队前拒绝。
- 线程版在极端内存压力下可能卡住；`worker.js` 会先压缩一张 16×16 测试图，15 秒没有回应就整体退回单线程池。
- 压缩不提供百分比进度（引擎不汇报），活动坞给的是真实耗时与吞吐，不是估算进度条。

## 许可

本项目 MIT。`public/pngdeer/` 是 [heydeer/pngdeer](https://github.com/heydeer/pngdeer) 的 MIT 构建，依赖许可见
`public/pngdeer/THIRD_PARTY_LICENSES.txt`；`public/samples/` 的来源与许可见 `public/samples/SOURCES.md`。
