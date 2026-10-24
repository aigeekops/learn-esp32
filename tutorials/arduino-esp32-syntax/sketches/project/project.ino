#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
WebServer server(80);
const char* SSID = "YOUR_SSID";
const char* PASSWORD = "YOUR_PASSWORD";
bool serverStarted = false;
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 display(128, 64, &Wire, -1);
enum Alarm { NORMAL, ALARM, ACK };
Alarm state = NORMAL;
float temperatureC = 25;
int thresholdC = 30;
bool stable = false, candidate = false;
unsigned long changedAt = 0, sampledAt = 0;
float readTemperature() {
  return (analogReadMilliVolts(35) - 500.0f) / 10.0f;
}
void evaluateAlarm(bool press) {
  if (temperatureC < thresholdC) state = NORMAL;
  else if (state == NORMAL) state = ALARM;
  else if (state == ALARM && press) state = ACK;
  digitalWrite(23, state != NORMAL);
  ledcWriteTone(25, state == ALARM && millis() % 1000 < 100 ? 2000 : 0);
}
void updateAlarm(unsigned long now) {
  bool raw = digitalRead(27) == LOW;
  if (raw != candidate) { candidate = raw; changedAt = now; }
  bool press = false;
  if (now - changedAt >= 30 && stable != candidate) {
    stable = candidate; press = stable;
  }
  if (now - sampledAt >= 200) {
    sampledAt = now; temperatureC = readTemperature();
  }
  evaluateAlarm(press);
}
String stateJson() {
  return String("{\"temperatureC\":") + String(temperatureC, 1) + ",\"thresholdC\":" + thresholdC + ",\"alarmState\":\"" + (state == NORMAL ? "NORMAL" : state == ALARM ? "ALARM" : "ACK") + "\",\"led\":" + (state != NORMAL ? "true" : "false") + ",\"buzzer\":" + (state == ALARM && millis() % 1000 < 100 ? "true" : "false") + ",\"networkConnected\":" + (WiFi.status() == WL_CONNECTED ? "true" : "false") + "}";
}

void setup() {
  Serial.begin(115200);
  pinMode(23, OUTPUT);
  pinMode(27, INPUT_PULLUP);
  analogReadResolution(12);
  analogSetPinAttenuation(35, ADC_11db);
  ledcAttach(25, 2000, 10);
  Wire.begin(21, 22);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED not found");
    while (true) delay(1000);
  }
  server.on("/", HTTP_GET, [](){
    server.send(200, "text/html", R"HTML(<h1>ESP32 MONITOR</h1><input id="t" type="number" min="10" max="50" value="30"><button onclick="save()">Set threshold</button><pre id="s"></pre><script>async function save(){await fetch('/api/config',{method:'POST',body:new URLSearchParams({threshold:document.getElementById('t').value})});}setInterval(async()=>{document.getElementById('s').textContent=await(await fetch('/api/state')).text();},1000);</script>)HTML");
  });
  server.on("/api/state", HTTP_GET, [](){
    server.send(200, "application/json", stateJson());
  });
  server.on("/api/config", HTTP_POST, [](){
    String v = server.arg("threshold");
    int value = v.toInt();
    if (v != String(value) || value < 10 || value > 50) {
      server.send(400, "application/json", "{\"error\":\"threshold must be integer 10-50\"}"); return;
    }
    thresholdC = value; evaluateAlarm(false);
    server.send(200, "application/json", stateJson());
  });
  server.onNotFound([](){server.send(404, "application/json", "{\"error\":\"not found\"}");});
  WiFi.mode(WIFI_STA); WiFi.begin(SSID, PASSWORD);
}

void loop() {
  unsigned long now = millis();
  updateAlarm(now);
  if (WiFi.status() == WL_CONNECTED && !serverStarted) {
    server.begin(); serverStarted = true; Serial.println(WiFi.localIP());
  }
  if (serverStarted) server.handleClient();
  static unsigned long drawnAt = 0;
  if (now - drawnAt >= 500) {
    drawnAt = now; display.clearDisplay();
    display.setTextColor(SSD1306_WHITE); display.setTextSize(1); display.setCursor(0, 0);
    display.println("ESP32 MONITOR"); display.print(temperatureC, 1); display.println(" C");
    display.print("LIMIT "); display.println(thresholdC);
    display.println(state == NORMAL ? "NORMAL" : state == ALARM ? "ALARM" : "ACK");
    display.display();
  }
}
