<p align="center">
  <a href="README.md">中文</a> · <a href="README.en.md">English</a>
</p>

# Learn ESP32 · Robot 0→1 Online Lab

Build a differential-drive robot end to end in the browser with an ESP32: wire it, code it, tune it, close the loop, integrate it. 25 lessons, targeting the **ESP32-DevKitC V4 / ESP32-WROOM-32E (38-pin)** board.

It does not replace hardware. It replaces the expensive trial-and-error before hardware: miswired pins, a cooked driver, a wrong CPR, a reversed PI sign, a forgotten command timeout.

[Curriculum](docs/CURRICULUM.md) · [Robotics track](docs/ROBOTICS_COURSES.md) · [Pin budget](docs/PIN_MAP.md) · [Programming Guide (WeChat)](https://mp.weixin.qq.com/s/fG325zBvtpMfLdrcj9bx6g) · [Contributing](CONTRIBUTING.md) · [MIT License](LICENSE)

![ESP32 robot lab](docs/images/desktop-board.png)

## Positioning

- **The ESP32 is the vehicle; the robot system is the point.** Lessons 1–12 cover levels, PWM, ADC, I²C and timing; 13–16 make the robot commandable from outside; 17–25 connect sensing, actuation, feedback, communication and safe stop into one machine.
- **"0→1" means the whole chain runs, not "meet the board".** By the end you should command `TWIST` velocity (m/s, rad/s), read measured speed back, stop at an obstacle, and stop when the link dies.
- **Simulation buys down trial-and-error, not hardware.** Every effect has units, every parameter has a source, every sketch exports as `.ino`; wiring and flashing still need real parts.
- **Fewer lessons, harder acceptance.** Five stages, what you should be able to do, and what failure looks like:

| Stage | You should be able to | Common failure |
| --- | --- | --- |
| Concepts | point at the wire that would fry the board, and at an input-only pin | 5 V straight into a GPIO; ADC2 while Wi-Fi is on |
| Wiring | rebuild a lesson circuit without the answer, and say why a part needs its own supply | missing common ground; un-divided ECHO; motor fed from 3V3 |
| Code | explain why each line is there, and predict the effect of a parameter change | treating PWM as a speed command; delay-based multitasking |
| Closed loop | 90 RPM under 30% load; 1 m straight within 5 cm | wrong CPR; reversed encoder; jittery PI period |
| Integration | command <100 ms; stop at an obstacle; stop 1 s after link loss; still on boot | no command timeout; no fail-safe |

## Features and Boundaries

- 3D board and components: pan, rotate, zoom, pick, inspector, and focus.
- Parameters, example code, schematics, scenarios, and serial feedback are linked together.
- Four lesson tabs, code copy, simulated run/stop, settings, and local learning progress.
- Classroom demos for knob dimming, a night light, a mini piano, a smart plant, Wi-Fi, HTTP, and web control.
- The robotics spine covers ranging, motor drivers, encoders, PI speed control, differential drive, UART, BLE, ESP-NOW, and a complete two-wheel robot; external commands follow ROS 2 Twist semantics (m/s, rad/s).
- Lessons are in Chinese; English instructions and a 13-language UI entry are provided. Full lesson text for the other 11 languages is not yet translated.

**This is a parametric teaching model.** It does not execute arbitrary C++, does not connect to your computer's Wi-Fi, Bluetooth, serial ports, or a real ESP32, and does not simulate breadboard hole conductivity. Real hardware requires separate compilation, flashing, and wiring. It is an independent community learning project.

## Quick Start

Requires **Node.js 24.x** and the bundled npm. A `.nvmrc` is provided; with nvm you can run `nvm use` first.

From the repository root after cloning:

```bash
npm ci
npm run dev
```

Open the Local address printed in the terminal. The browser needs WebGL support. No account, database, server API, or environment variables are required.

| Command | Purpose |
| --- | --- |
| `npm test` | Core behavior tests |
| `npm run build` | Type-check and static build, outputs `dist/` |
| `npm run preview` | Preview the build locally |
| `npm run build:standalone` | Build and emit a self-contained `output/learn-esp32.html` |
| `npm run check:dist` | Verify root/subdirectory assets, licenses, and single-file script syntax |
| `npm run firmware:export` | Export 25 default `.ino` files plus the ESP-NOW sender (26 sketches) |
| `npm run firmware:check` | Compile the default examples with the installed Arduino CLI |

`dist/`, `output/`, and dependencies are not committed to Git. The static build bundles the full license notices for this project and Three.js; the single-file HTML also keeps these notices. The `file://` mode has not been directly verified in a browser; preview over HTTP first.

## Deploy to GitHub

You can publish directly to **GitHub Pages** without renting a server. The repository provides a read-only CI. Pushing to the `main` branch **automatically triggers** the Pages build and deployment; you can also trigger it manually from Actions.

1. Place the contents of this directory at the GitHub repository root, including `.github/` and the lockfile.
2. In the repository **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
3. Push (or merge a PR) to `main`, or open **Actions → Deploy to GitHub Pages → Run workflow** and select the default branch.
4. After the workflow succeeds, visit the site at the address given by the deployment.

Assets use relative paths, so the same `dist/` works for both a user homepage and a repository subdirectory. The Pages site runs the browser teaching model; real-device firmware does not run on GitHub's servers. See [deployment docs](docs/DEPLOYMENT.md) for configuration notes and release checks.

Learning progress is stored in the visitor's browser and is not synced across devices. Changing the site's domain or port will not migrate progress automatically.

## Lessons

Lessons 1–16 are the parts bin: 1–12 cover levels, PWM, ADC, I²C and timing; 13–16 hand control to an outside device. Lessons 17–25 are the machine itself: sensing, actuation, feedback, communication and safe stop. Grouping is for reading only; nothing is locked.

Wiring comes in two stages: lessons 1–16 are breadboard experiments, lessons 17–25 assemble the robot on a [fixed pin map](docs/PIN_MAP.md). The one-time migration between them is documented in the pin budget.

| Lesson | Content |
| --- | --- |
| 01–04 | Meet the ESP32, blink, button, knob dimming |
| 05–08 | RGB mixing, night light, temperature alarm, OLED |
| 09–12 | Non-blocking control, servo, smart plant, mini piano (optional) |
| 13–16 | Wi-Fi, web temperature, web LED control (optional), connected plant monitor (optional) |
| 17–20 | Ultrasonic ranging, motor drive, encoder feedback, PI speed control |
| 21–25 | Differential drive, UART, BLE (optional), ESP-NOW (optional), complete two-wheel robot |

Lessons marked optional are not on the main dependency chain and can be skipped; lessons 23 and 24 are two carriers of the same command contract, so either one is enough.

See [lesson definitions](docs/CURRICULUM.md) for lesson parameters, pins, and the four-tab content.

## Programming Guide

[Six Months of Robotics, Part 7: Arduino / ESP32 syntax from zero](https://mp.weixin.qq.com/s/fG325zBvtpMfLdrcj9bx6g) (WeChat, Chinese) walks from variables, branches, loops and functions to arrays, objects, callbacks, a display and networking, with 16 lesson snapshots and three standalone exercises.

The article is published on WeChat; the cover, SVG/PNG artwork, rendering script and 16 example sketches stay in [the tutorial folder](tutorials/arduino-esp32-syntax/README.md). The guide is maintained independently from the live lessons; see its [version record](tutorials/arduino-esp32-syntax/VERSION.json) when comparing lesson order, pins, or APIs.

## Real Firmware

Baseline is Arduino-ESP32 **3.3.12**, FQBN **`esp32:esp32:esp32`**, serial **115200 baud**. Lessons 8, 11, and 16 depend on:

- Adafruit SSD1306 **2.5.17**
- Adafruit GFX Library **1.13.0**
- Adafruit BusIO **1.17.4**

After installing the Arduino CLI, configure the official index and pin the dependencies:

```bash
arduino-cli core update-index --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core install esp32:esp32@3.3.12 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli lib install "Adafruit SSD1306@2.5.17" "Adafruit GFX Library@1.13.0" "Adafruit BusIO@1.17.4"
npm run firmware:check
```

Custom CLI path or config file:

```bash
npm run firmware:check -- /path/to/arduino-cli /path/to/config.yaml
```

Example source files are written to `output/sketches/<lesson ID>/<lesson ID>.ino`. Lesson 24 exports the robot receiver by default; the additional controller sender is at `output/sketches/espnow-sender/espnow-sender.ino`. Configure the other board's STA MAC on both ESP32s and use the same channel. BLE uses the bundled GATT library. See the [robotics guide](docs/ROBOTICS_COURSES.md) for wiring and protocols.

Reports are written to `output/compile/`. The script uses the system temp directory for builds and cleans up intermediate files afterward. For networked examples, fill in the SSID and password only in your own local copy; do not commit credentials.

The **16/16 default firmware compile record** from **2026-10-24** is saved in the [validation summary](docs/validation/2026-10-24-firmware.json). This is a dated historical record; it does not mean every later change has been compiled, nor that real-device verification has passed. See [development acceptance record](docs/DEVELOPMENT_REPORT.md) for detailed boundaries.

## Project Structure

```text
src/
  lessons.ts       lesson, parameter, and pin definitions
  lesson-guide.ts  step-by-step bilingual lesson guidance
  learning-parts.ts light, piano, and plant models
  robot-lessons.ts robotics lessons, parameters, and terminals
  robot-guide.ts   bilingual robotics guidance
  robot-firmware.ts robotics sketches and both ESP-NOW roles
  robot-simulation.ts motors, encoders, PI, and communication model
  robot-parts.ts   robotics 3D parts and scene feedback
  robot-shared.ts  robotics state contract
  circuit.ts       shared wiring endpoints and SVG schematics
  firmware.ts      Arduino C++ templates
  simulation.ts    teaching behavior model
  scene.ts         Three.js scene and component manipulation
  main.ts          page and interaction
scripts/           export, compile, license preparation, and bundling
public/            static assets
tests/             core behavior tests
docs/              lessons, architecture, acceptance, and deployment docs
.github/           CI, Pages, and collaboration templates
```

## Current Status

Version **0.1.0**. The 25 Chinese lessons and main interactions work. Pixel-by-pixel / animation-by-animation comparison, full lesson text translation for other languages, and real mobile-device / real-hardware verification are not yet done. Known limitations and the scope of checks are recorded in the [acceptance doc](docs/DEVELOPMENT_REPORT.md); a successful build is not presented as hardware or teaching-effectiveness verification.

CI runs only basic behavior tests, build, distribution checks, and example exports; it does not auto-download the full ESP32 toolchain or repeat flashing tests.

## Acknowledgements and License

The UI and interactions reference [Learn Arduino](https://learn-arduino-red.vercel.app/) (DilumSanjaya). The application, models, and graphics in this repository are implemented independently; they do not include that site's build scripts or 3D assets, and are not affiliated with that site, Arduino, or Espressif.

Original content in this project is licensed under [MIT](LICENSE). Third-party dependencies and references keep their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md) and [source record](docs/REFERENCES.md). The MIT notice does not cover third-party trademarks or unauthorized external assets.
