#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
WebServer server(80);
const char* SSID = "YOUR_SSID";
const char* PASSWORD = "YOUR_PASSWORD";
bool serverStarted = false;

void setup() {
  Serial.begin(115200);
  pinMode(23, OUTPUT);
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", R"HTML(<h1>ESP32 LED</h1><button onclick="set(1)">ON</button><button onclick="set(0)">OFF</button><pre id="state"></pre><script>async function set(v){await fetch('/api/led',{method:'POST',body:new URLSearchParams({value:v})});document.getElementById('state').textContent=await(await fetch('/api/state')).text();}</script>)HTML");
  });
  server.on("/api/state", HTTP_GET, []() {
    String body = String("{\"led\":") + (digitalRead(23) ? "true" : "false") + "}";
    server.send(200, "application/json", body);
  });
  server.on("/api/led", HTTP_POST, []() {
    String v = server.arg("value");
    if (v != "0" && v != "1") {
      server.send(400, "application/json", "{\"error\":\"invalid value\"}"); return;
    }
    digitalWrite(23, v == "1");
    server.send(200, "application/json", String("{\"led\":") + (v == "1" ? "true" : "false") + "}");
  });
  server.onNotFound([](){ server.send(404, "application/json", "{\"error\":\"not found\"}"); });
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED && !serverStarted) {
    server.begin(); serverStarted = true;
    Serial.println(WiFi.localIP());
  }
  if (serverStarted) server.handleClient();
}
