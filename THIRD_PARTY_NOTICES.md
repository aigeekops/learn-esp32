# 第三方声明

本项目的 MIT 许可证只适用于本仓库原创内容。第三方软件、商标和参考资料不因此改用 MIT。

## Web 应用依赖

以下为当前直接依赖；完整解析版本与传递依赖元数据在 `package-lock.json`。

| 软件 | 固定版本 | 许可 | 用途 |
| --- | --- | --- | --- |
| [Three.js](https://github.com/mrdoob/three.js) | 0.186.1 | MIT | 浏览器运行时 3D 渲染 |
| [@types/three](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/three) | 0.186.0 | MIT | 开发时类型定义 |
| [Vite](https://github.com/vitejs/vite) | 8.3.5 | MIT；包内依赖声明见其 LICENSE.md | 开发/构建 |
| [TypeScript](https://github.com/microsoft/TypeScript) | 7.0.2 | Apache-2.0；另有 NOTICE.txt | 类型检查 |

当前生产包直接包含 Three.js。`scripts/prepare-notices.mjs` 在构建前从实际安装的 Three.js 包读取完整 LICENSE，生成 `dist/THIRD_PARTY_NOTICES.txt`；项目 MIT 文本生成到 `dist/LICENSE.txt`。单文件打包将两者完整嵌入 HTML 的 `license-notices` 数据块。分发时应保留这些声明。

开发依赖不随 Web 应用分发；若另行分发这些工具，应保留它们软件包内的 LICENSE、NOTICE 和第三方声明，而不能仅附本项目许可证。

## 本地字体

界面字体随应用本地打包，不请求第三方字体 CDN。字体文件位于 `public/fonts/`，许可证全文同目录保存，并会并入构建产物的第三方声明。

| 字体 | 文件 | 许可 |
| --- | --- | --- |
| [Barlow](https://github.com/jpt/barlow) | `barlow-400/500/600.woff2` | SIL Open Font License 1.1 |
| [Barlow Semi Condensed](https://github.com/jpt/barlow) | `barlow-semi-condensed-500/600/700.woff2` | SIL Open Font License 1.1 |
| [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) | `jetbrains-mono.woff2` | SIL Open Font License 1.1 |

字体取自 Google Fonts 的上游发行版，仅包含拉丁字符子集；中文回退到系统字体（PingFang SC、微软雅黑等）。

## 固件依赖

课程 `.ino` 是本项目示例源代码。Arduino-ESP32 Core、Adafruit SSD1306、Adafruit GFX 与 Adafruit BusIO 是用户另行安装的工具链/库，不打包进 Web 应用；各自保留上游许可。本仓库不提供预编译固件二进制。另行发布链接了这些库的固件时，需要核对所用版本的上游许可与分发要求。

## 设计与教学参考

- [Learn Arduino](https://learn-arduino-red.vercel.app/)（DilumSanjaya）提供界面与交互参照。本仓库未获得其应用、模型、素材的重用许可证，也未将其构建文件或素材并入应用；界面字体另行取自 Google Fonts 上游 OFL 发行版。
- ESP32 技术内容依据乐鑫及器件厂商资料，课程和图形独立编写。开源课程和资料的来源、各自许可及借鉴范围见 [来源记录](docs/REFERENCES.md)。

项目并非 Arduino、Espressif、Adafruit 或参考站的官方产品。产品名称用于标识适配对象或来源，不表示隶属或背书。
