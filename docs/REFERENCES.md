# 参考来源与研究记录 v0.2

核查日期：2026-10-24。用途：为计划提供可追溯依据；不把公开访问视为复制授权，不把资料正确视为本项目已经实现。

当前需求：原站界面和交互复刻，开发板与课程适配 ESP32。以下开源课程仅用于技术内容参考，不作为重排原站交互、增加考核或改变进度规则的依据。

## 1. 参考站的观察与静态分析

参考站：[Learn Arduino](https://learn-arduino-red.vercel.app/)。浏览器实际访问了中文版，检查了开发板、LED、旋钮课程、元件列表、引脚表、原理图和运行入口。

已观察事实：

- 16 课，工作台式 3D 主视图，可平移、旋转、缩放，点击元件查看说明。
- LED 课程可通过参数控件改变亮灭时间，代码中的数值随之更新。
- 原理图、引脚连接表、代码、串口和场景组成同一课程的不同视图。
- 运行后有日志和完成进度变化。

公开脚本的静态研究进一步表明：

- HTML 加载 Vite 风格的 ES modules，渲染模块包含 Three.js 的 WebGL、正交相机及拾取实现。
- main 模块把课程说明、参数、代码与课程实验标识组织在一起。
- stage 模块根据实验标识选择行为函数；LED 模型直接使用亮/灭时长和电阻等课程参数。
- 本次检查的 runSketch 路径在等待后显示“编译/上传”过程，再初始化课程行为函数。该路径不构成真实 Arduino 编译和烧录证据。
- 参数、设置与进度使用浏览器本地存储。

结论：复刻其参数化教学机制在技术范围上成立；原站的动画提示不能作为本项目固件执行能力的要求依据。不对未公开源码和其他版本作判断。

本次研究只下载公开 HTML、JS 和 CSS 到临时目录做静态检查，没有执行下载脚本，也没有把这些文件并入项目。

| 本次检查的公开产物 | 字节数 | SHA-256 |
| --- | --- | --- |
| /zh/ HTML | 21079 | ce2c3dfee7670e4ca38eddce10521eb0ab0d0bc0cb5769e5374853fee0279207 |
| /assets/index-GGrOCNGj.js | 6136 | c7c8c763c63b71c8cc8dc7b2a2f31bd909cc6e8b1c7ede5a30f573e90ba39eb6 |
| /assets/main-Bvl_zo-E.js | 131725 | 6e911cbdf62e4148df4afcdaff9870f41043bf150fa05ab80a1bece3bd207271 |
| /assets/stage-QLKhHYHN.js | 424589 | d82c1cb5a543fada4a2c4b7fa6f88f7893bb6ef0d8757f2fc7c237c1f56e3440 |
| /assets/kit-DXbMhk_I.js | 316523 | 0a4a9d07bc450a9c87d4106ea800034d0e2a14ae8c3a9dccac28d346431e9405 |

临时文件不是项目依赖，哈希用于标识本次观察的构建。尚未查得覆盖原站应用、模型和素材的重用许可证，故本计划选择独立实现。

## 2. 硬件与运行环境依据

| 来源 | 支持的设计决定 |
| --- | --- |
| [ESP32-DevKitC V4 官方指南](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html) | 板型、两侧各 19 个针脚、模组版本、供电互斥、按键及电源灯含义；机械图从该页进入 |
| [ESP32-WROOM-32E 数据手册](https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.html) | 模组电气条件、引脚与接口；GPIO 电平按 3.3 V 设计 |
| [ESP32 GPIO 官方说明](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/gpio.html) | 输入专用脚、内部上下拉限制、启动配置脚、ADC2/Wi-Fi 使用限制 |
| [Arduino-ESP32 3.3.12 发布页](https://github.com/espressif/arduino-esp32/releases/tag/3.3.12) | 核查时存在的官方发布版本，作为真机代码的固定基线 |
| [Arduino-ESP32 GPIO API](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/gpio.html) | pinMode、digitalRead、digitalWrite 和 INPUT_PULLUP |
| [Arduino-ESP32 ADC API](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/adc.html) | 默认 12 位、原始值/校准毫伏值、衰减与实际量程 |
| [Arduino-ESP32 LEDC API](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/ledc.html) | 3.x 的 pin API、PWM、音调、频率/分辨率与定时器共享约束 |
| [Arduino-ESP32 Wi-Fi API](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/wifi.html) | STA、AP、连接状态及 IP；本计划只使用 STA 课程主线 |
| [官方 HelloServer 示例](https://github.com/espressif/arduino-esp32/blob/3.3.12/libraries/WebServer/examples/HelloServer/HelloServer.ino) | 芯片提供网页与 HTTP 路由的实现路线；正式写课时按锁定版本读实际代码并编译 |
| [TMP36 官方数据手册](https://www.analog.com/media/en/technical-documentation/data-sheets/tmp35_36_37.pdf) | 输出偏置、10 mV/°C 换算、低电压供电及封装脚序 |
| [Adafruit SSD1306](https://github.com/adafruit/Adafruit_SSD1306) / [GFX](https://github.com/adafruit/Adafruit-GFX-Library) | OLED 驱动与图形层；文档列明 GFX 和 BusIO 依赖，库版本在 M2 锁定 |

官方 latest/stable 页面会随版本变化。后续编写固件时以 3.3.12 实际导出和编译结果为准；变更基线时同步修改代码和文档，不维护两套 API。

## 3. 课程来源及可借鉴范围

| 来源 | 本项目参考内容 | 授权状态与使用方式 |
| --- | --- | --- |
| [Espressif ESP-IDF Basic Workshop](https://developer.espressif.com/workshops/esp-idf-basic/) | 讲解、作业和组合项目之间的递进；硬件与联网链路 | Developer Portal [源码仓库](https://github.com/espressif/developer-portal) 标注 MIT；具体材料检查独立声明，本轮仅参考结构 |
| [Embedded Rust on Espressif](https://esp-rs.github.io/std-training/) | 教材、起始工程、练习与参考实现共同维护 | [仓库](https://github.com/esp-rs/std-training)明确教材 CC BY-SA 4.0，代码 MIT/Apache-2.0；借鉴组织方式，首版课程与 Arduino 代码自行编写 |
| [Freenove ESP32 Ultimate Starter Kit](https://github.com/Freenove/Freenove_Ultimate_Starter_Kit_for_ESP32) | 元件解释、实验步骤、接线与观察结果的表达 | 仓库 [LICENSE](https://github.com/Freenove/Freenove_Ultimate_Starter_Kit_for_ESP32/blob/master/LICENSE.txt) 为 CC BY-NC-SA 3.0；本轮不搬运其图文、接线图片和代码 |
| [MIT 6.002](https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/) | 电路模型、测量和解释之间的联系 | OCW [条款](https://ocw.mit.edu/pages/privacy-and-terms-of-use/)为 CC BY-NC-SA 4.0，并有第三方材料例外；本轮参考知识组织，独立写课和作图 |
| [Modern Embedded Systems Programming](https://github.com/QuantumLeaps/modern-embedded-programming-course) | 状态机、非阻塞组织和调试思路 | 配套仓库标注 AGPL-3.0，不据此推定视频授权；本轮不移植其代码 |

Rust 培训和 ARM 课程不直接决定本项目代码接口、引脚和板型；这些由乐鑫资料及所选器件规格确定。

补充：esp-rs 的 std 培训当前说明其依赖由社区维护；官方支持方向是 esp-hal/no_std，但 [no_std 培训首页](https://docs.espressif.com/projects/rust/no_std-training/)标注内容过时、正在重写。因此只参考其教学结构，不将该技术栈作为本项目运行依赖。

MIT 6.08 的 [官方教学介绍](https://mitadmissions.org/blogs/entry/6-08-intro-to-eecs-via-interconnected-embedded-systems/)可用于了解 ESP32、实验和综合项目组织。其旧课程站在核查时跳转无关内容，本项目不依赖旧域名，也不把它列作可直接复用的完整教材。

## 4. 前端实现依据

- [Vite 官方指南](https://vite.dev/guide/)：本地开发、TypeScript 模板与静态产物构建。
- [Three.js 官方文档](https://threejs.org/docs/)：正交相机、WebGLRenderer、几何体、拾取和场景对象。
- 前端已锁定：Three.js 0.186.1、@types/three 0.186.0、TypeScript 7.0.2、Vite 8.3.5；以 package-lock.json 为准。

## 5. 证据边界

| 类别 | 本轮状态 |
| --- | --- |
| 参考站浏览器观察 | 已完成，范围见第一节 |
| 参考站公开产物静态研究 | 已完成，只分析本次下载的构建 |
| 官方资料与课程授权声明核查 | 已完成，记录在本文件；不代表第三方素材已获授权 |
| v0.2 范围、交互约束、引脚及模拟/真机链路 | 已完成文档层面核对；完整交互对照尚未执行 |
| 前端功能、构建、性能检查 | 基本功能与构建通过，未做性能压测和跨浏览器矩阵 |
| Arduino 课程工程编译 | 16/16 默认示例通过 Core 3.3.12 编译，见 docs/validation/2026-10-24-firmware.json |
| 实物接线、传感器读数、局域网控制 | 未开始 |
| 上线发布 | 未开始 |

## 6. v0.2 范围修订

按用户最新要求，保留原站交互，课程内容贴合 ESP32。撤回 v0.1 的强制学习步骤、变化题、任务通过门槛、证据进度和工程下载入口；恢复原站式四个页签、实时调参和运行后完成标记。

本轮还从已下载的公开 main 模块确认了标注、电流流动、网格、空闲旋转、声音、减弱动画、进度重置和13语种菜单的定义。具体布局、边界操作和动画仍需在M1按界面对照记录，不能把脚本中存在定义等同于已完成复刻验收。

## 7. 开发环境固定版本

2026-10-24 开发：Arduino CLI 1.5.2-rc.1（从 Arduino 官方下载站获得），ESP32 Core 3.3.12；SSD1306 2.5.17、GFX 1.13.0、BusIO 1.17.4 通过 Arduino 官方库索引安装。工具链隔离在临时目录，未改动用户现有 Arduino 配置。
