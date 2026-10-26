import type {Lesson,Values} from './lessons.ts';

const rangeCode=String.raw`
//~超声波 5 V，ECHO 分压到约 3 V~HC-SR04 5 V, ECHO divided to ~3 V
const int TRIG = 13, ECHO = 14;  //~触发/回响脚~trig / echo
const float STOP_CM = @@stopDistance@@;
portMUX_TYPE echoMux = portMUX_INITIALIZER_UNLOCKED;
volatile uint32_t echoRiseUs = 0, echoWidthUs = 0;
volatile bool echoHigh = false, echoReady = false;
bool rangeValid = false, rangeWaiting = false;
float distanceCm = 0;
uint32_t rangeAt = 0, triggerAt = 0;
void ARDUINO_ISR_ATTR echoEdge() {
  uint32_t now = micros();
  portENTER_CRITICAL_ISR(&echoMux);
  if (digitalRead(ECHO)) { echoRiseUs = now; echoHigh = true; }
  else if (echoHigh) { echoWidthUs = now - echoRiseUs; echoReady = true; echoHigh = false; }
  portEXIT_CRITICAL_ISR(&echoMux);
}
void setupRange() {
  pinMode(TRIG, OUTPUT); digitalWrite(TRIG, LOW); pinMode(ECHO, INPUT);
  attachInterrupt(digitalPinToInterrupt(ECHO), echoEdge, CHANGE);
  rangeAt = millis() - 100;
}
void updateRange() {
  uint32_t now = millis(), width = 0; bool ready = false;
  portENTER_CRITICAL(&echoMux);
  if (echoReady) { width = echoWidthUs; ready = true; echoReady = false; }
  portEXIT_CRITICAL(&echoMux);
  if (rangeWaiting && ready) {
    rangeWaiting = false; rangeValid = width >= 100 && width <= 25000;
    if (rangeValid) distanceCm = width * 0.0343f / 2.0f;  //~声速换算成厘米~speed of sound to cm
  }
  if (rangeWaiting && uint32_t(micros() - triggerAt) >= 25000) {
    rangeWaiting = false; rangeValid = false;
  }
  if (!rangeWaiting && uint32_t(now - rangeAt) >= 100) {
    rangeAt = now;
    portENTER_CRITICAL(&echoMux); echoReady = false; echoHigh = false; portEXIT_CRITICAL(&echoMux);
    rangeWaiting = true; triggerAt = micros();
    digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW);
  }
}
`;

function motorCode(dual:boolean,feedback:boolean,controlled:boolean,mode:string):string {
 return String.raw`
//~TB6612：3.3 V 逻辑，VM 单独供电~TB6612: 3.3 V logic, VM separate
//~前进时计数应为正~forward motion counts up
const int PWM_L = 25, IN_L1 = 18, IN_L2 = 19, STBY = 4;  //~左轮 PWM/方向/使能~left: PWM, dir, standby
${dual?'const int PWM_R = 26, IN_R1 = 23, IN_R2 = 27;':''}
const float MAX_RPM = 180.0f, COMMAND_LIMIT = 150.0f;
float targetL = 0, targetR = 0, rpmL = 0, rpmR = 0;
int dutyL = 0, dutyR = 0;
${feedback?String.raw`
//~每转计数（A 相上升沿）~counts per turn, A rising edge
const float CPR = @@cpr@@;
portMUX_TYPE encoderMux = portMUX_INITIALIZER_UNLOCKED;
volatile int32_t countL = 0, countR = 0;
int32_t previousL = 0, previousR = 0;
void ARDUINO_ISR_ATTR encoderLeft() {
  portENTER_CRITICAL_ISR(&encoderMux); countL += digitalRead(33) ? -1 : 1; portEXIT_CRITICAL_ISR(&encoderMux);  //~B 相定方向~phase B sets direction
}
${dual?String.raw`void ARDUINO_ISR_ATTR encoderRight() {
  portENTER_CRITICAL_ISR(&encoderMux); countR += digitalRead(35) ? -1 : 1; portEXIT_CRITICAL_ISR(&encoderMux);
}`:''}
`:''}
${controlled?String.raw`
const float KP = @@kp@@, KI = @@ki@@;  //~PI 参数，先小后大~PI gains, start small
float integralL = 0, integralR = 0;
int piDuty(float target, float measured, float &integral, float dt) {
  if (target == 0) { integral = 0; return 0; }
  float error = target - measured;
  float nextIntegral = constrain(integral + KI * error * dt, -255.0f, 255.0f);
  float candidate = KP * error + nextIntegral;
  //~饱和时暂停积分~skip integrating while saturating
  if ((candidate <= 255 || error < 0) && (candidate >= -255 || error > 0)) integral = nextIntegral;
  return int(lroundf(constrain(KP * error + integral, -255.0f, 255.0f)));
}`:''}
void driveWheel(int pwm, int in1, int in2, int duty) {
  duty = constrain(duty, -255, 255);
  digitalWrite(in1, duty > 0); digitalWrite(in2, duty < 0);
  ledcWrite(pwm, abs(duty));  //~方向由 IN1/IN2 决定~direction comes from IN1/IN2
}
void writeDrive() {
  driveWheel(PWM_L, IN_L1, IN_L2, dutyL);
  ${dual?'driveWheel(PWM_R, IN_R1, IN_R2, dutyR);':''}
}
void setupDrive() {
  pinMode(STBY, OUTPUT); digitalWrite(STBY, LOW);
  pinMode(IN_L1, OUTPUT); pinMode(IN_L2, OUTPUT); ledcAttach(PWM_L, 20000, 8);
  ${dual?'pinMode(IN_R1, OUTPUT); pinMode(IN_R2, OUTPUT); ledcAttach(PWM_R, 20000, 8);':''}
  writeDrive(); digitalWrite(STBY, HIGH);
  ${feedback?String.raw`pinMode(32, INPUT_PULLUP); pinMode(33, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(32), encoderLeft, RISING);
  ${dual?String.raw`//~GPIO34/35 无内部上拉~GPIO34/35 have no pull-ups
  pinMode(34, INPUT); pinMode(35, INPUT);
  attachInterrupt(digitalPinToInterrupt(34), encoderRight, RISING);`:''}`:''}
}
void updateDrive() {
  static uint32_t sampledAt = 0;
  uint32_t now = millis(), elapsed = now - sampledAt;
  if (elapsed < 100) return;  //~每 100 ms 更新~update every 100 ms
  sampledAt = now; float dt = elapsed / 1000.0f;
  ${feedback?String.raw`int32_t left, right;
  portENTER_CRITICAL(&encoderMux); left = countL; right = countR; portEXIT_CRITICAL(&encoderMux);
  rpmL = (left - previousL) * 60.0f / (CPR * dt); previousL = left;
  ${dual?'rpmR = (right - previousR) * 60.0f / (CPR * dt); previousR = right;':''}`:''}
  ${mode==='motor'||mode==='encoder'?'dutyL = @@drive@@;':mode==='speed'?String.raw`targetL = @@targetRpm@@;
  if (String("@@control@@") == "closed") dutyL = piDuty(targetL, rpmL, integralL, dt);
  else { integralL = 0; dutyL = int(lroundf(targetL / MAX_RPM * 255)); }`:controlled?String.raw`dutyL = piDuty(targetL, rpmL, integralL, dt);
  dutyR = piDuty(targetR, rpmR, integralR, dt);`:''}
  writeDrive();
}
`;
}

const commandCode=String.raw`
portMUX_TYPE commandMux = portMUX_INITIALIZER_UNLOCKED;
float pendingL = 0, pendingR = 0;
uint32_t pendingAt = 0, lastCommandAt = 0;
bool commandFresh = false;
volatile bool commandPending = false;
bool parseCommand(const String &line, float &left, float &right) {
  if (line == "STOP") { left = right = 0; return true; }
  int consumed = 0;
  if (sscanf(line.c_str(), "SET,%f,%f%n", &left, &right, &consumed) != 2 || consumed != int(line.length())) return false;
  return isfinite(left) && isfinite(right) && fabsf(left) <= COMMAND_LIMIT && fabsf(right) <= COMMAND_LIMIT;
}
void queueTargets(float left, float right) {
  portENTER_CRITICAL(&commandMux);
  pendingL = left; pendingR = right; pendingAt = millis(); commandPending = true;
  portEXIT_CRITICAL(&commandMux);
}
bool receiveCommand(const String &line) {
  float left, right;
  if (!parseCommand(line, left, right)) return false;
  queueTargets(left, right); return true;
}
void consumeCommand() {
  portENTER_CRITICAL(&commandMux);
  if (commandPending) {
    targetL = pendingL; targetR = pendingR; lastCommandAt = pendingAt;
    commandFresh = true; commandPending = false;
  }
  portEXIT_CRITICAL(&commandMux);
}
void stopDrive() {
  dutyL = dutyR = 0; integralL = integralR = 0; writeDrive();
}
void expireCommand() {
  if (!commandFresh || uint32_t(millis() - lastCommandAt) >= 1000) {
    targetL = targetR = 0; commandFresh = false;
  }
  if (targetL == 0) { dutyL = 0; integralL = 0; }
  if (targetR == 0) { dutyR = 0; integralR = 0; }
  writeDrive();
}
String stateLine() {
  char line[96];
  snprintf(line, sizeof(line), "STATE,%.1f,%.1f,%.1f,%.1f,%d,%d", targetL, targetR, rpmL, rpmR, dutyL, dutyR);
  return String(line);
}
`;
const uartCode=String.raw`
String rxFrame;
bool frameOverflow = false;
void readCommands(HardwareSerial &port) {
  while (port.available()) {
    char ch = char(port.read());
    if (ch == '\r') continue;
    if (ch == '\n') {
      if (!frameOverflow && receiveCommand(rxFrame)) port.println("ACK");
      else port.println("ERR invalid frame");
      rxFrame = ""; frameOverflow = false;
    } else if (!frameOverflow) {
      if (rxFrame.length() < 63) rxFrame += ch;
      else { rxFrame = ""; frameOverflow = true; }
    }
  }
}
`;

const espnowPacket=String.raw`
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
//~填另一块板的 STA MAC，开机时会打印~put the other board's STA MAC here
const uint8_t PEER_MAC[6] = {0, 0, 0, 0, 0, 0};
const uint8_t RADIO_CHANNEL = @@channel@@;
struct __attribute__((packed)) RadioPacket {
  uint32_t magic; uint8_t version, kind; uint16_t reserved;
  uint32_t sequence; int16_t left, right, actualLeft, actualRight;
};
const uint32_t PACKET_MAGIC = 0x45535052;
bool radioReady = false;
volatile bool txReported = false, txSuccess = false;
void onRadioSent(const esp_now_send_info_t *info, esp_now_send_status_t status) {
  txSuccess = status == ESP_NOW_SEND_SUCCESS; txReported = true;
}
bool setupRadio() {
  WiFi.mode(WIFI_STA);
  esp_wifi_set_channel(RADIO_CHANNEL, WIFI_SECOND_CHAN_NONE);
  Serial.print("STA MAC: "); Serial.println(WiFi.macAddress());
  bool configured = false; for (uint8_t b : PEER_MAC) configured |= b != 0;
  if (!configured) { Serial.println("Set PEER_MAC on both boards before sending."); return false; }
  if (esp_now_init() != ESP_OK) { Serial.println("ESP-NOW init failed"); return false; }
  esp_now_peer_info_t peer = {}; memcpy(peer.peer_addr, PEER_MAC, 6);
  peer.channel = RADIO_CHANNEL; peer.ifidx = WIFI_IF_STA; peer.encrypt = false;
  if (esp_now_add_peer(&peer) != ESP_OK) { Serial.println("Peer registration failed"); return false; }
  esp_now_register_send_cb(onRadioSent); return true;
}
`;

function espnowReceiver():string {
 return '#include <Arduino.h>\n#include <math.h>\n'+espnowPacket+motorCode(true,true,true,'espnow')+commandCode+String.raw`
portMUX_TYPE radioMux = portMUX_INITIALIZER_UNLOCKED;
bool haveSequence = false; uint32_t latestSequence = 0;
volatile bool stateReplyPending = false;
uint32_t replySequence = 0;
void onRadioReceive(const esp_now_recv_info_t *info, const uint8_t *data, int length) {
  if (memcmp(info->src_addr, PEER_MAC, 6) != 0 || length != sizeof(RadioPacket)) return;
  RadioPacket packet; memcpy(&packet, data, sizeof(packet));
  if (packet.magic != PACKET_MAGIC || packet.version != 1 || packet.kind != 1 ||
      abs(int(packet.left)) > COMMAND_LIMIT || abs(int(packet.right)) > COMMAND_LIMIT) return;
  portENTER_CRITICAL(&radioMux);
  if (haveSequence && int32_t(packet.sequence - latestSequence) <= 0) { portEXIT_CRITICAL(&radioMux); return; }
  latestSequence = packet.sequence; haveSequence = true;
  replySequence = packet.sequence; stateReplyPending = true;
  portEXIT_CRITICAL(&radioMux);
  queueTargets(packet.left, packet.right);
}
void setup() {
  Serial.begin(115200); setupDrive();
  radioReady = setupRadio();
  if (radioReady) esp_now_register_recv_cb(onRadioReceive);
}
void loop() {
  consumeCommand(); expireCommand(); updateDrive();
  bool reply = false; uint32_t sequence = 0;
  portENTER_CRITICAL(&radioMux);
  if (stateReplyPending) { reply = true; sequence = replySequence; stateReplyPending = false; }
  portEXIT_CRITICAL(&radioMux);
  if (reply && radioReady) {
    consumeCommand(); expireCommand();
    RadioPacket packet = {PACKET_MAGIC, 1, 2, 0, sequence,
      int16_t(lroundf(targetL)), int16_t(lroundf(targetR)), int16_t(lroundf(rpmL)), int16_t(lroundf(rpmR))};
    esp_now_send(PEER_MAC, reinterpret_cast<const uint8_t*>(&packet), sizeof(packet));
  }
  static uint32_t reportedAt = 0;
  if (millis() - reportedAt >= 200) { reportedAt = millis(); Serial.println(stateLine()); }
}
`;
}

function espnowSender():string {
 return '#include <Arduino.h>\n#include <math.h>\n'+espnowPacket+String.raw`
// Type SET,60,60 or STOP followed by a newline in the USB serial monitor.
// Send commands periodically (e.g. every 200 ms) to keep the receiver moving.
const float COMMAND_LIMIT = 150;
uint32_t nextSequence = 1;
String rxFrame; bool frameOverflow = false;
portMUX_TYPE statusMux = portMUX_INITIALIZER_UNLOCKED;
RadioPacket receivedState = {}; volatile bool stateReady = false;
bool parseCommand(const String &line, float &left, float &right) {
  if (line == "STOP") { left = right = 0; return true; }
  int consumed = 0;
  return sscanf(line.c_str(), "SET,%f,%f%n", &left, &right, &consumed) == 2 &&
    consumed == int(line.length()) && isfinite(left) && isfinite(right) &&
    fabsf(left) <= COMMAND_LIMIT && fabsf(right) <= COMMAND_LIMIT;
}
void onRadioReceive(const esp_now_recv_info_t *info, const uint8_t *data, int length) {
  if (memcmp(info->src_addr, PEER_MAC, 6) != 0 || length != sizeof(RadioPacket)) return;
  RadioPacket packet; memcpy(&packet, data, sizeof(packet));
  if (packet.magic != PACKET_MAGIC || packet.version != 1 || packet.kind != 2) return;
  portENTER_CRITICAL(&statusMux); receivedState = packet; stateReady = true; portEXIT_CRITICAL(&statusMux);
}
void setup() {
  Serial.begin(115200); radioReady = setupRadio();
  if (radioReady) esp_now_register_recv_cb(onRadioReceive);
}
void loop() {
  while (Serial.available()) {
    char ch = char(Serial.read()); if (ch == '\r') continue;
    if (ch == '\n') {
      float left, right;
      if (!frameOverflow && parseCommand(rxFrame, left, right) && radioReady) {
        RadioPacket packet = {PACKET_MAGIC, 1, 1, 0, nextSequence++,
          int16_t(lroundf(left)), int16_t(lroundf(right)), 0, 0};
        esp_err_t result = esp_now_send(PEER_MAC, reinterpret_cast<const uint8_t*>(&packet), sizeof(packet));
        Serial.println(result == ESP_OK ? "QUEUED (await STATE reply)" : "ERR send queue");
      } else Serial.println("ERR invalid command or radio not ready");
      rxFrame = ""; frameOverflow = false;
    } else if (!frameOverflow) {
      if (rxFrame.length() < 63) rxFrame += ch; else { rxFrame = ""; frameOverflow = true; }
    }
  }
  if (txReported) { txReported = false; Serial.println(txSuccess ? "LINK delivered; await STATE" : "LINK failed"); }
  RadioPacket state = {}; bool ready = false;
  portENTER_CRITICAL(&statusMux);
  if (stateReady) { state = receivedState; stateReady = false; ready = true; }
  portEXIT_CRITICAL(&statusMux);
  if (ready) Serial.printf("STATE seq=%lu target=%d,%d measured=%d,%d\n",
    (unsigned long)state.sequence, state.left, state.right, state.actualLeft, state.actualRight);
}
`;
}

const bleCode=String.raw`
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
const char *SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const char *WRITE_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
const char *NOTIFY_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
volatile bool phoneConnected = false;
BLECharacteristic *statusCharacteristic;
class RobotServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *server) override { phoneConnected = true; }
  void onDisconnect(BLEServer *server) override { phoneConnected = false; }
};
class RobotWriteCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    String line = characteristic->getValue();
    //~CR/LF 只是分帧，不属于命令~CR/LF is framing, not the command
    while (line.endsWith("\n") || line.endsWith("\r")) line.remove(line.length() - 1);
    if (line.length() <= 63) receiveCommand(line);
  }
};
void setupBLE() {
  BLEDevice::init("ESP32 Robot");
  BLEServer *server = BLEDevice::createServer(); server->setCallbacks(new RobotServerCallbacks());
  BLEService *service = server->createService(SERVICE_UUID);
  BLECharacteristic *command = service->createCharacteristic(WRITE_UUID, BLECharacteristic::PROPERTY_WRITE);
  command->setCallbacks(new RobotWriteCallbacks());
  statusCharacteristic = service->createCharacteristic(NOTIFY_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  statusCharacteristic->addDescriptor(new BLE2902());
  service->start(); server->getAdvertising()->addServiceUUID(SERVICE_UUID); server->getAdvertising()->start();
}
void updateBLE() {
  static bool wasConnected = false; static uint32_t notifiedAt = 0;
  if (!phoneConnected) {
    targetL = targetR = 0; commandFresh = false; stopDrive();
    portENTER_CRITICAL(&commandMux); commandPending = false; portEXIT_CRITICAL(&commandMux);
    if (wasConnected) BLEDevice::startAdvertising();
  }
  if (phoneConnected && millis() - notifiedAt >= 200) {
    notifiedAt = millis();
    //~四个带符号转速值能放进 20 字节通知~four signed RPMs fit a 20-byte notify
    char payload[32]; snprintf(payload, sizeof(payload), "%d,%d,%d,%d",
      int(lroundf(targetL)), int(lroundf(targetR)), int(lroundf(rpmL)), int(lroundf(rpmR)));
    statusCharacteristic->setValue(reinterpret_cast<const uint8_t*>(payload), strlen(payload));
    statusCharacteristic->notify(); Serial.println(stateLine());
  }
  wasConnected = phoneConnected;
}
`;

export function robotTemplate(l:Lesson,values?:Values):string {
 const id=l.id;
 if(id==='espnow')return values?.radioRole==='sender'?espnowSender():espnowReceiver();
 if(id==='distance')return '#include <Arduino.h>\n'+rangeCode+String.raw`
void setup() { Serial.begin(115200); pinMode(23, OUTPUT); setupRange(); }
void loop() {
  updateRange(); digitalWrite(23, !rangeValid || distanceCm <= STOP_CM);
  static uint32_t reportedAt = 0;
  if (millis() - reportedAt >= 100) {
    reportedAt = millis();
    if (rangeValid) Serial.printf("DISTANCE=%.1f cm ECHO=%.0f us\n", distanceCm, distanceCm * 2 / 0.0343f);
    else Serial.println("DISTANCE=INVALID (no echo)");
  }
}
`;
 const dual=['differential','uart','ble','robot'].includes(id),feedback=id!=='motor',controlled=!['motor','encoder'].includes(id),communication=['uart','ble','robot'].includes(id);
 let text='#include <Arduino.h>\n#include <math.h>\n'+motorCode(dual,feedback,controlled,id);
 if(communication)text+=commandCode;
 if(id==='uart'||id==='robot')text+=uartCode;
 if(id==='robot')text+=rangeCode;
 if(id==='ble')text+=bleCode;
 if(id==='differential')text+=String.raw`
const float WHEEL_RADIUS = @@wheelRadius@@, TRACK_WIDTH = @@trackWidth@@;
void differentialTargets() {
  float v = @@linear@@, omega = @@angular@@;
  targetL = (v - omega * TRACK_WIDTH / 2) * 60 / (2 * PI * WHEEL_RADIUS);
  targetR = (v + omega * TRACK_WIDTH / 2) * 60 / (2 * PI * WHEEL_RADIUS);
  float peak = fmaxf(fabsf(targetL), fabsf(targetR));
  if (peak > COMMAND_LIMIT) { float scale = COMMAND_LIMIT / peak; targetL *= scale; targetR *= scale; }
}
float x = 0, y = 0, heading = 0;
void updateOdometry() {
  static uint32_t updatedAt = 0;
  uint32_t now = millis(), elapsed = now - updatedAt;
  if (elapsed < 100) return;  //~每 100 ms 更新~update every 100 ms
  updatedAt = now; float dt = elapsed / 1000.0f;
  float vl = rpmL * 2 * PI * WHEEL_RADIUS / 60, vr = rpmR * 2 * PI * WHEEL_RADIUS / 60;
  float velocity = (vl + vr) / 2, omega = (vr - vl) / TRACK_WIDTH;
  float middle = heading + omega * dt / 2;
  x += velocity * cosf(middle) * dt; y += velocity * sinf(middle) * dt; heading += omega * dt;
}
`;
 text+='\nvoid setup() {\n  Serial.begin(115200); setupDrive();\n';
 if(id==='uart'||id==='robot')text+='  Serial2.begin(115200, SERIAL_8N1, 16, 17);\n';
 if(id==='robot')text+='  setupRange();\n';
 if(id==='ble')text+='  setupBLE();\n';
 text+='}\nvoid loop() {\n';
 if(id==='uart'||id==='robot')text+='  readCommands(Serial2);\n';
 if(id==='ble')text+='  updateBLE();\n';
 if(communication)text+='  consumeCommand(); expireCommand();\n';
 if(id==='robot')text+='  updateRange();\n  bool blocked = !rangeValid || distanceCm <= STOP_CM;\n  if (blocked) { targetL = targetR = 0; commandFresh = false; stopDrive(); }\n  updateDrive();\n';
 else {if(id==='differential')text+='  differentialTargets();\n';text+='  updateDrive();\n';}
 if(id==='differential')text+='  updateOdometry();\n';
 text+='  static uint32_t reportedAt = 0;\n  if (millis() - reportedAt >= 200) {\n    reportedAt = millis();\n';
 if(id==='motor')text+='    Serial.printf("PWM=%d (open loop; no speed sensor in this lesson)\\n", dutyL);\n';
 else if(id==='encoder')text+='    Serial.printf("COUNT=%ld RPM=%.1f PWM=%d\\n", (long)previousL, rpmL, dutyL);\n';
 else if(id==='speed')text+='    Serial.printf("TARGET=%.1f RPM=%.1f PWM=%d\\n", targetL, rpmL, dutyL);\n';
 else if(id==='differential')text+='    Serial.printf("TARGET=%.1f,%.1f RPM=%.1f,%.1f X=%.3f Y=%.3f HEADING=%.3f\\n", targetL, targetR, rpmL, rpmR, x, y, heading);\n';
 else if(id==='uart')text+='    Serial2.println(stateLine()); Serial.println(stateLine());\n';
 else if(id==='robot')text+='    String state = stateLine() + (rangeValid ? String(",DISTANCE=") + String(distanceCm, 1) : String(",DISTANCE=INVALID"));\n    Serial2.println(state); Serial.println(state);\n';
 text+='  }\n}\n';return text;
}
