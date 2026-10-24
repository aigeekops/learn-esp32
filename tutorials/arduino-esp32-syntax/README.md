# Arduino / ESP32 语法入门 · 六个月学机器人⑦

从零读懂并写出程序：通用语法、完整示例，以及输入输出、屏幕和联网的实际用法。

- [阅读完整文章](article.md)
- [19 个程序：16 个课程快照与 3 个独立练习](#配套代码)
- [封面与机制图](images/)
- [验证与版本](VALIDATION.md)

![六个月学机器人：看懂 ESP32 程序](images/cover-wide.png)

## 配套代码

- `sketches/`：16 份课程示例快照，每个目录是一份可单独打开的 sketch。
- `examples/syntax_lab/`：仅用串口串联函数、数组、引用、对象、String 和 Lambda。
- `examples/cooperative_timing/`：两个独立节奏的非阻塞计时。
- `examples/serial_control/`：串口发送 `1`、`0`、`?` 控制与查询 LED。

示例基线：Arduino-ESP32 **3.3.12**、ESP32-WROOM-32E、FQBN `esp32:esp32:esp32`、串口 **115200**。详细来源见 [VERSION.json](VERSION.json)。

网站课程仍在更新，这里是独立学习材料和代码快照。新增旋钮调光、光控夜灯、琴键、植物浇水等课时，请按功能核对实际课序和引脚，不把本目录当作课程源码的实时副本。

## 重新生成配图

需要 Node.js，并安装支持中文的字体，如 PingFang SC、Microsoft YaHei 或 Noto Sans CJK SC。

```sh
cd tutorials/arduino-esp32-syntax/tools
npm install
npm run render
```

`render-assets.mjs` 保留封面与三张机制图的全部布局和文字，生成 SVG、PNG 及居中方形封面预览。画布采用系列的米白、深绿配色；横版封面为 1880×800，标题在中心方形裁切内完整可见。

## 许可与验证

原创文章、示例与绘图代码采用 [MIT](LICENSE)。外部参考、商标和第三方依赖保留各自权利。编译通过与实际烧录、测量是不同验证阶段，见 [验证记录](VALIDATION.md)。

本目录不包含公众号凭据、微信草稿回执或暂不发布的旧教程。
