#include <Arduino.h>
#include <WiFi.h>
const char* SSID = "YOUR_SSID";
const char* PASSWORD = "YOUR_PASSWORD";

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
}

void loop() {
  static unsigned long reportedAt = 0;
  if (millis() - reportedAt < 500) return;
  reportedAt = millis();
  if (WiFi.status() == WL_CONNECTED) Serial.println(WiFi.localIP());
  else Serial.printf("WiFi status: %d\n", WiFi.status());
}
