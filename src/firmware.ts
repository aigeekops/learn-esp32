import type { Lesson, Values } from './lessons.ts';
import {isRobotLesson} from './robot-shared.ts';
import {robotTemplate} from './robot-firmware.ts';

// Inline annotations are authored as `//~中文~English` after the code they explain.
// resolveNotes() picks the language at render time and lays the note out for the panel:
// short lines keep the note trailing and aligned, long lines move it to the line above.
const NOTE=/^([^\n]*?)[ \t]*\/\/~([^~\n]+)~([^\n]+)$/;
// The code column is ~40 ASCII characters wide at every scale, so notes are laid out
// in columns: keep them trailing when they fit, otherwise lift them onto their own line.
const NOTE_COLUMNS=40, CJK_COLUMNS=1.667;
const textColumns=(text:string)=>[...text].reduce((w,ch)=>w+(ch.charCodeAt(0)>0x2e7f?CJK_COLUMNS:1),0);
const resolveNotes=(code:string,english:boolean)=>code.split('\n').map(line=>{
 const m=NOTE.exec(line);
 if(!m)return line;
 const body=m[1].replace(/\s+$/,''),text=(english?m[3]:m[2]).trim();
 if(!body.trim())return body+'// '+text;
 const indent=(body.match(/^[ \t]*/)||[''])[0],noteWidth=textColumns(text)+3;
 if(body.length+2+noteWidth<=NOTE_COLUMNS)return body+'  // '+text;
 return indent+'// '+text+'\n'+body;
}).join('\n');

const wrap=(setup:string,loop:string,extra='')=>'#include <Arduino.h>\n'+extra+'\nvoid setup() {\n  Serial.begin(115200);  //~串口 115200 波特率~serial at 115200 baud\n'+setup+'\n}\n\nvoid loop() {\n'+loop+'\n}\n';
const led='  pinMode(23, OUTPUT);  //~GPIO23 设为输出~GPIO23 as an output';
const sensor='float readTemperature() {\n  return (analogReadMilliVolts(35) - 500.0f) / 10.0f;  //~10 mV/°C，0 °C = 500 mV~10 mV per °C, 500 mV at 0 °C\n}\n';
const oledIncludes='#include <Wire.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>\nAdafruit_SSD1306 display(128, 64, &Wire, -1);\n';
const oledSetup='  Wire.begin(21, 22);\n  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {  //~I2C 地址 0x3C~I2C address 0x3C\n    Serial.println("OLED not found");\n    while (true) delay(1000);\n  }\n';
const network='#include <WiFi.h>\n#include <WebServer.h>\nWebServer server(80);\nconst char* SSID = "YOUR_SSID";\nconst char* PASSWORD = "YOUR_PASSWORD";\nbool serverStarted = false;\n';

const soilSetup='  analogReadResolution(12);  //~12 位 ADC 0–4095~12-bit ADC 0-4095\n  analogSetPinAttenuation(34, ADC_11db);\n';
const soilDefs=String.raw`//~示例值，请实测干湿读数~example - measure your own
const int DRY = @@dry@@;
const int WET = @@wet@@;
int thresholdPercent = @@thirsty@@;
int sensorRaw = 0, moisturePercent = 55;
void readSoil() {
  sensorRaw = analogRead(34);
  moisturePercent = constrain(map(sensorRaw, DRY, WET, 0, 100), 0L, 100L);  //~换算成湿度 %~scale to percent
}
bool needsWater() { return moisturePercent < thresholdPercent; }  //~低于阈值=缺水~below = thirsty
void drawPlant() {
  display.clearDisplay(); display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1); display.setCursor(0, 0); display.println("ESP32 GARDEN");
  display.setTextSize(2); display.setCursor(0, 15);
  display.print(moisturePercent); display.println("%");
  display.drawRect(0, 34, 128, 9, SSD1306_WHITE);
  display.fillRect(2, 36, moisturePercent * 124 / 100, 5, SSD1306_WHITE);  //~湿度条长度~bar length = humidity
  display.setTextSize(1); display.setCursor(0, 50);
  display.println(needsWater() ? "Water me!" : moisturePercent > @@soggy@@ ? "Too wet!" : "Happy :)");
  display.display();
}
`;
const gardenServer=String.raw`
void updateOutputs() {
  digitalWrite(23, needsWater());
  ledcWriteTone(25, needsWater() && millis() % 1000 < 100 ? 2000 : 0);
}
String stateJson() {
  return String("{\"moisturePercent\":") + moisturePercent + ",\"raw\":" + sensorRaw +
    ",\"thresholdPercent\":" + thresholdPercent + ",\"needsWater\":" + (needsWater() ? "true" : "false") +
    ",\"networkConnected\":" + (WiFi.status() == WL_CONNECTED ? "true" : "false") + "}";
}
const char* GARDEN_PAGE = R"HTML(<!doctype html><meta name="viewport" content="width=device-width"><title>ESP32 Garden</title>
<h1>ESP32 Garden</h1><p id="message">Connecting...</p><progress id="moisture" max="100"></progress>
<p>Water me below <input id="threshold" type="number" min="10" max="50" value="@@thirsty@@"> % <button onclick="save()">Save</button></p><pre id="state"></pre>
<script>
async function refresh(){const s=await(await fetch('/api/state')).json();document.getElementById('state').textContent=JSON.stringify(s,null,2);document.getElementById('moisture').value=s.moisturePercent;document.getElementById('message').textContent=s.moisturePercent+'% - '+(s.needsWater?'Water me!':'Happy :)');}
async function save(){const r=await fetch('/api/config',{method:'POST',body:new URLSearchParams({threshold:document.getElementById('threshold').value})});if(!r.ok){document.getElementById('message').textContent=await r.text();return;}await refresh();}
setInterval(refresh,1000);refresh();
</script>)HTML";
`;

function rawTemplate(l:Lesson,values?:Values):string {
 if(isRobotLesson(l.id))return robotTemplate(l,values);
 switch(l.id){
  case 'board':return wrap('  Serial.println("ESP32 ready");  //~开机打印一次~printed once at boot','  static unsigned long count = 0;\n  Serial.printf("loop %lu\\n", count++);\n  delay(1000);  //~每秒一次~once per second');
  case 'blink':return wrap(led,'  digitalWrite(23, HIGH);  //~高电平点亮~HIGH lights the LED\n  Serial.println("GPIO23=1");\n  delay(@@on@@);  //~亮的时长~on time\n  digitalWrite(23, LOW);\n  Serial.println("GPIO23=0");\n  delay(@@off@@);','// GPIO23 -> @@ohms@@ ohm -> LED -> GND\n');
  case 'button':return wrap(led+'\n  pinMode(27, INPUT_PULLUP);  //~上拉，按下为低~pull-up, pressed=LOW','  bool pressed = digitalRead(27) == LOW;\n  bool lit = pressed != bool(@@inverted@@);\n  digitalWrite(23, lit);  //~LED 跟随按键~LED mirrors the button\n  static int previous = -1;\n  if (previous != int(pressed)) {  //~只在变化时打印~log only on change\n    previous = pressed;\n    Serial.printf("BUTTON=%d LED=%d\\n", !pressed, lit);\n  }\n  delay(1);');
  case 'knob':return wrap(`  analogReadResolution(12);  //~12 位 ADC 0–4095~12-bit ADC 0-4095
  analogSetPinAttenuation(34, ADC_11db);
  ledcAttach(23, 5000, 8);  //~5 kHz，8 位 PWM~5 kHz, 8-bit PWM`, `  int raw = analogRead(34);
  int brightness = map(raw, 0, 4095, 0, 255);
  ledcWrite(23, brightness);
  Serial.printf("ADC=%d PWM=%d\\n", raw, brightness);
  delay(100);`);
  case 'pwm':return wrap(`  ledcAttach(23, 5000, 8);  //~5 kHz，8 位 PWM~5 kHz, 8-bit PWM
  ledcAttach(19, 5000, 8);  //~绿通道~green channel
  ledcAttach(18, 5000, 8);  //~蓝通道~blue channel`, `  ledcWrite(23, @@red@@);  //~红亮度 0–255~red level 0-255
  ledcWrite(19, @@green@@);  //~绿亮度~green level
  ledcWrite(18, @@blue@@);  //~蓝亮度~blue level
  delay(10);`);
  case 'light':return wrap(`  pinMode(23, OUTPUT);
  analogReadResolution(12);  //~12 位 ADC 0–4095~12-bit ADC 0-4095
  analogSetPinAttenuation(34, ADC_11db);`, `  int light = analogRead(34);  //~读光敏分压~read the LDR divider
  bool night = light < @@lightThreshold@@;  //~越暗数值越小~darker = lower
  digitalWrite(23, night);  //~天黑自动开灯~LED on at night
  Serial.printf("LIGHT=%d LED=%d\\n", light, night);
  delay(100);`, '// 3V3 -> LDR -> GPIO34 -> 10k -> GND\n');
  case 'temperature':return wrap(led+`
  analogReadResolution(12);  //~12 位 ADC 0–4095~12-bit ADC 0-4095
  analogSetPinAttenuation(35, ADC_11db);
  ledcAttach(25, 2000, 10);`, `  static unsigned long sampledAt = 0;
  static float temperatureC = 25;
  unsigned long now = millis();  //~读毫秒计时~read the ms clock
  if (now - sampledAt >= 200) {  //~每 200 ms 采样~sample every 200 ms
    sampledAt = now; temperatureC = readTemperature();
    Serial.printf("%.1f C\\n", temperatureC);
  }
  bool hot = temperatureC >= @@threshold@@;  //~超过阈值报警~alarm above threshold
  digitalWrite(23, hot);
  ledcWriteTone(25, hot && now % 1000 < 100 ? 2000 : 0);`,sensor);
  case 'timing':return wrap(led+`
  pinMode(27, INPUT_PULLUP);  //~上拉，按下为低~pull-up, pressed=LOW
  analogReadResolution(12);  //~12 位 ADC 0–4095~12-bit ADC 0-4095
  analogSetPinAttenuation(34, ADC_11db);`, `  static unsigned long toggledAt = 0, sampledAt = 0;
  static bool lit = false;
  unsigned long now = millis();  //~读毫秒计时~read the ms clock
  if (now - toggledAt >= @@interval@@) {  //~到点翻转，不阻塞~flip when due
    toggledAt = now; lit = !lit;
  }
  bool pressed = digitalRead(27) == LOW;
  digitalWrite(23, pressed || lit);
  if (now - sampledAt >= @@period@@) {  //~采样节奏独立~independent sample rate
    sampledAt = now;
    Serial.printf("ADC=%d BUTTON=%d\\n", analogRead(34), !pressed);
  }`);
  case 'display':return wrap(`  analogReadResolution(12);  //~12 位 ADC 0–4095~12-bit ADC 0-4095
  analogSetPinAttenuation(35, ADC_11db);
`+oledSetup, `  static unsigned long drawnAt = 0;
  if (millis() - drawnAt < @@refresh@@) return;
  drawnAt = millis();
  float temperatureC = readTemperature();
  display.clearDisplay(); display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1); display.setCursor(0, 0);
  display.println("ESP32 THERMOMETER");
  display.setTextSize(2); display.setCursor(0, 17);
  display.print(temperatureC, 1); display.println(" C");
  display.drawRect(0, 40, 128, 10, SSD1306_WHITE);
  display.fillRect(2, 42, constrain(int(temperatureC / 60 * 124), 0, 124), 6, SSD1306_WHITE);
  display.display();`,oledIncludes+sensor);
  case 'piano':return wrap(`  for (int i = 0; i < 8; i++) pinMode(KEYS[i], INPUT_PULLUP);  //~8 键上拉输入~8 pull-up keys
  ledcAttach(25, 2000, 10);`, `  int pressed = -1;
  for (int i = 0; i < 8; i++) {
    if (digitalRead(KEYS[i]) == LOW) pressed = i;
  }
  static int playing = -1;
  if (pressed != playing) {
    playing = pressed;
    int frequency = playing < 0 ? 0 : NOTES[playing] * @@octave@@;  //~查表得到频率~look up the frequency
    ledcWriteTone(25, frequency);  //~蜂鸣器发声~sound the buzzer
    if (playing >= 0) Serial.printf("%s %d Hz\\n", NAMES[playing], frequency);
    else Serial.println("Note off");
  }`, `const int KEYS[] = {13, 14, 16, 17, 18, 19, 26, 27};
const int NOTES[] = {262, 294, 330, 349, 392, 440, 494, 523};
const char* NAMES[] = {"Do", "Re", "Mi", "Fa", "Sol", "La", "Si", "Do"};
`);
  case 'plant':return wrap(soilSetup+oledSetup, `  readSoil();
  drawPlant();
  Serial.printf("RAW=%d MOISTURE=%d%%\\n", sensorRaw, moisturePercent);
  delay(500);`,oledIncludes+soilDefs);
  case 'project':return wrap(soilSetup+oledSetup+`  pinMode(23, OUTPUT);
  ledcAttach(25, 2000, 10);
  server.on("/", HTTP_GET, [](){ server.send(200, "text/html; charset=utf-8", GARDEN_PAGE); });  //~首页返回控制页~control page
  server.on("/api/state", HTTP_GET, [](){ server.send(200, "application/json", stateJson()); });
  server.on("/api/config", HTTP_POST, [](){  //~网页写新阈值~page sets the threshold
    String v = server.arg("threshold");
    int value = v.toInt();
    if (v != String(value) || value < 10 || value > 50) {
      server.send(400, "application/json", "{\\"error\\":\\"threshold must be integer 10-50\\"}"); return;
    }
    thresholdPercent = value; updateOutputs();
    server.send(200, "application/json", stateJson());
  });
  server.onNotFound([](){ server.send(404, "application/json", "{\\"error\\":\\"not found\\"}"); });
  WiFi.mode(WIFI_STA); WiFi.begin(SSID, PASSWORD);  //~填自己的热点~your own hotspot`, `  unsigned long now = millis();  //~读毫秒计时~read the ms clock
  static unsigned long sampledAt = 0, drawnAt = 0;
  if (now - sampledAt >= 200) { sampledAt = now; readSoil(); }  //~每 200 ms 采样~sample every 200 ms
  updateOutputs();
  if (now - drawnAt >= 500) { drawnAt = now; drawPlant(); }
  if (WiFi.status() == WL_CONNECTED && !serverStarted) {
    server.begin(); serverStarted = true; Serial.println(WiFi.localIP());
  }
  if (serverStarted) server.handleClient();  //~循环里处理请求~serve each loop`,network+oledIncludes+soilDefs+gardenServer);
  case 'servo':return wrap('  ledcAttach(18, 50, 16);  //~50 Hz，16 位~50 Hz, 16-bit','  const int pulseUs = @@pulse@@;  //~脉宽 500–2500 µs~pulse 500-2500 µs\n  uint32_t duty = lround(pulseUs * 65536.0 / 20000.0);  //~脉宽换占空比~pulse to duty\n  ledcWrite(18, duty);\n  delay(20);','//~舵机独立 5 V 供电，共地~servo: own 5 V, common ground\n');
  case 'wifi':return wrap('  WiFi.mode(WIFI_STA);\n  WiFi.begin(SSID, PASSWORD);','  static unsigned long reportedAt = 0;\n  if (millis() - reportedAt < 500) return;\n  reportedAt = millis();\n  if (WiFi.status() == WL_CONNECTED) Serial.println(WiFi.localIP());  //~连上后打印 IP~print the IP once online\n  else Serial.printf("WiFi status: %d\\n", WiFi.status());','#include <WiFi.h>\nconst char* SSID = "YOUR_SSID";\nconst char* PASSWORD = "YOUR_PASSWORD";\n');
  case 'http':case 'web':{
   const isWeb=l.id==='web';
   const routes='  server.on("/", HTTP_GET, []() {  //~首页返回 HTML~index returns HTML\n    server.send(200, "text/html", R"HTML('+ (isWeb?'<h1>ESP32 LED</h1><button onclick="set(1)">ON</button><button onclick="set(0)">OFF</button><pre id="state"></pre><script>async function set(v){await fetch(\\\'/api/led\\\',{method:\\\'POST\\\',body:new URLSearchParams({value:v})});document.getElementById(\\\'state\\\').textContent=await(await fetch(\\\'/api/state\\\')).text();}</script>':'<h1>ESP32</h1><a href="/api/state">Device state</a>')+')HTML");\n  });\n'+
   '  server.on("/api/state", HTTP_GET, []() {  //~JSON 状态接口~JSON state\n    String body = '+(isWeb?'String("{\\"led\\":") + (digitalRead(23) ? "true" : "false") + "}"':'String("{\\"temperatureC\\":") + String(readTemperature(), 1) + "}"')+';\n    server.send(200, "application/json", body);\n  });\n'+(isWeb?'  server.on("/api/led", HTTP_POST, []() {  //~只接受 0 / 1~accept only 0 or 1\n    String v = server.arg("value");\n    if (v != "0" && v != "1") {\n      server.send(400, "application/json", "{\\"error\\":\\"invalid value\\"}"); return;\n    }\n    digitalWrite(23, v == "1");\n    server.send(200, "application/json", String("{\\"led\\":") + (v == "1" ? "true" : "false") + "}");\n  });\n':'')+
   '  server.onNotFound([](){ server.send(404, "application/json", "{\\"error\\":\\"not found\\"}"); });\n';
   return wrap((isWeb?led:'  analogReadResolution(12);  //~12 位 ADC 0–4095~12-bit ADC 0-4095\n  analogSetPinAttenuation(35, ADC_11db);')+'\n'+routes+'  WiFi.mode(WIFI_STA);\n  WiFi.begin(SSID, PASSWORD);','  if (WiFi.status() == WL_CONNECTED && !serverStarted) {\n    server.begin(); serverStarted = true;\n    Serial.println(WiFi.localIP());\n  }\n  if (serverStarted) server.handleClient();  //~循环里处理请求~serve each loop',network+(isWeb?'':sensor));
  }

 }
 throw new Error('Unknown lesson '+l.id);
}
export function template(l:Lesson,values?:Values,english=false):string{
 return resolveNotes(rawTemplate(l,values),english);
}
export function codeValue(key:string,values:Values):string{
 return String(values[key]);
}
export function source(l:Lesson,p:Values,english=false):string{
 return template(l,p,english).replace(/@@(\w+)@@/g,(_,key)=>codeValue(key,p)).replaceAll("\\'","'");
}
