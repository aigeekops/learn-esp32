#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
WebServer server(80);
const char* SSID = "YOUR_SSID";
const char* PASSWORD = "YOUR_PASSWORD";
bool serverStarted = false;
float readTemperature() {
  return (analogReadMilliVolts(35) - 500.0f) / 10.0f;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(35, ADC_11db);
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", R"HTML(<h1>ESP32</h1><a href="/api/state">Device state</a>)HTML");
  });
  server.on("/api/state", HTTP_GET, []() {
    String body = String("{\"temperatureC\":") + String(readTemperature(), 1) + "}";
    server.send(200, "application/json", body);
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
