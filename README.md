<p align="center">
  <a href="README.md">中文</a> · <a href="README.en.md">English</a>
</p>

# Learn ESP32 · ESP32 交互学习站

通过 3D 电路、实时调参和 Arduino C++ 示例，在浏览器里学习 ESP32。包含 16 课，目标开发板为 **ESP32-DevKitC V4 / ESP32-WROOM-32E（38 针）**。

[课程内容](docs/CURRICULUM.md) · [语法入门](tutorials/arduino-esp32-syntax/README.md) · [参与贡献](CONTRIBUTING.md) · [MIT 许可证](LICENSE)

![ESP32 交互学习站](docs/images/desktop-board.png)

## 功能与边界

- 3D 开发板和器件：平移、旋转、缩放、拾取、检查器和聚焦。
- 参数、示例代码、原理图、场景和串口反馈联动。
- 四个课程页签、代码复制、模拟运行/停止、设置与本地学习进度。
- Wi-Fi、HTTP、网页控制和联网温度告警的课堂演示。
- 中文课程；英文说明及 13 语种界面入口。其余 11 种语言的课程全文尚未翻译。

**这是参数化教学模型**，不执行任意 C++，不连接电脑的 Wi-Fi 或真实 ESP32，也不模拟面包板孔位的导通。真实硬件需要另外编译、烧录和接线。它是独立的社区学习项目。

## 快速开始

需要 **Node.js 24.x** 和随附的 npm。已提供 `.nvmrc`；使用 nvm 时可先执行 `nvm use`。

进入克隆后的仓库根目录：

```bash
npm ci
npm run dev
```

打开终端打印的 Local 地址。浏览器需支持 WebGL。无需账户、数据库、服务端 API 或环境变量。

| 命令 | 用途 |
| --- | --- |
| `npm test` | 核心行为测试 |
| `npm run build` | 类型检查与静态构建，输出 `dist/` |
| `npm run preview` | 本地预览构建产物 |
| `npm run build:standalone` | 构建并生成内嵌资源的 `output/learn-esp32.html` |
| `npm run check:dist` | 核对根路径/子目录资源、许可证和单文件脚本语法 |
| `npm run firmware:export` | 导出 16 课默认 `.ino` |
| `npm run firmware:check` | 使用已安装的 Arduino CLI 编译默认示例 |

`dist/`、`output/` 和依赖目录不提交 Git。静态构建会附带本项目与 Three.js 的完整许可声明；单文件 HTML 也保留这些声明。`file://` 模式尚未进行直接浏览器验收，推荐先通过 HTTP 预览。

## 部署到 GitHub

可以直接发布到 **GitHub Pages**，无需租用服务器。仓库已提供只读权限的 CI；推送到 `main` 分支会**自动触发** Pages 构建与发布，也可在 Actions 中手动触发。

1. 将本目录内容放在 GitHub 仓库根目录，包括 `.github/` 和锁文件。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
3. 推送（或合并 PR）到 `main`，或打开 **Actions → Deploy to GitHub Pages → Run workflow** 手动触发，选择默认分支。
4. 工作流成功后，通过 deployment 给出的地址访问站点。

资源使用相对路径，同一份 `dist/` 可用于用户主页和仓库子目录。Pages 中运行的是浏览器教学模型；真实设备固件不在 GitHub 服务器上运行。配置说明与发布检查见 [部署文档](docs/DEPLOYMENT.md)。

学习进度保存在访问者浏览器，不会跨设备同步。更换站点域名或端口也不会自动迁移进度。

## 课程

| 课次 | 内容 |
| --- | --- |
| 01–04 | 认识 ESP32、LED、串口、按钮 |
| 05–08 | ADC 旋钮、RGB/PWM、温度、非阻塞控制 |
| 09–12 | OLED、蜂鸣器、舵机、状态机告警 |
| 13–16 | Wi-Fi、HTTP、网页控制、联网温度监测与告警 |

课程参数、引脚与四页签内容见 [课程定义](docs/CURRICULUM.md)。

## 编程入门文章

[《六个月学机器人⑦：Arduino / ESP32 语法入门，从零读懂并写出程序》](tutorials/arduino-esp32-syntax/article.md) 从变量、分支、循环、函数讲到数组、对象、回调、屏幕和联网，附 16 份课程示例快照与 3 个独立练习。

正文、封面、SVG/PNG 配图、绘图脚本及配套程序统一收在 [独立教程目录](tutorials/arduino-esp32-syntax/README.md)。教程与正在更新的课程实现分别维护，对照课序、引脚和 API 时请核对 [示例版本](tutorials/arduino-esp32-syntax/VERSION.json)。

## 真机代码

基线为 Arduino-ESP32 **3.3.12**、FQBN **`esp32:esp32:esp32`**、串口 **115200 baud**。第 9、16 课依赖：

- Adafruit SSD1306 **2.5.17**
- Adafruit GFX Library **1.13.0**
- Adafruit BusIO **1.17.4**

安装 Arduino CLI 后，配置官方索引和固定依赖：

```bash
arduino-cli core update-index --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core install esp32:esp32@3.3.12 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli lib install "Adafruit SSD1306@2.5.17" "Adafruit GFX Library@1.13.0" "Adafruit BusIO@1.17.4"
npm run firmware:check
```

自定义 CLI 路径或配置文件：

```bash
npm run firmware:check -- /path/to/arduino-cli /path/to/config.yaml
```

示例源文件输出到 `output/sketches/<课程 ID>/<课程 ID>.ino`；报告输出到 `output/compile/`。脚本使用系统临时目录构建，结束后清理中间文件。联网示例的 SSID、密码只在自己的本地副本填写，不提交凭据。

2026-10-24 的 **16/16 默认固件编译记录**已保存在 [验证摘要](docs/validation/2026-10-24-firmware.json)。这是带日期的历史记录，不代表后续每次修改都已经编译，也不代表真机验证通过。详细边界见 [开发验收记录](docs/DEVELOPMENT_REPORT.md)。

## 项目结构

```text
src/
  lessons.ts       课程、参数和引脚定义
  circuit.ts       共用接线端点与 SVG 原理图
  firmware.ts      Arduino C++ 模板
  simulation.ts    教学行为模型
  scene.ts         Three.js 场景与器件操作
  main.ts          页面与交互
scripts/           导出、编译、许可准备和打包
public/            静态资源
tests/            核心行为测试
docs/             课程、架构、验收与部署说明
.github/           CI、Pages 与协作模板
```

## 当前状态

版本 **0.1.0**。中文 16 课和主要交互可用，尚未完成逐像素/逐动画对照、其余语言全文翻译和真实移动设备/真机验证。已知限制和检查范围记录在 [验收文档](docs/DEVELOPMENT_REPORT.md)，不将构建成功写成硬件或教学效果验证。

CI 只执行基本行为测试、构建、分发检查和示例导出，不自动下载完整 ESP32 工具链或重复烧录测试。

## 致谢与许可

界面和操作参考 [Learn Arduino](https://learn-arduino-red.vercel.app/)（DilumSanjaya）。本仓库的应用、模型和图形独立实现，未包含该站的构建脚本或 3D 素材，与原站、Arduino、Espressif 无隶属关系。

本项目原创内容采用 [MIT](LICENSE)。第三方依赖及参考资料保留各自许可，见 [第三方声明](THIRD_PARTY_NOTICES.md) 和 [来源记录](docs/REFERENCES.md)。MIT 声明不覆盖第三方商标或未获授权的外部素材。
