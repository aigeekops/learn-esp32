#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 display(128, 64, &Wire, -1);
float readTemperature() {
  return (analogReadMilliVolts(35) - 500.0f) / 10.0f;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(35, ADC_11db);
  Wire.begin(21, 22);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED not found");
    while (true) delay(1000);
  }

}

void loop() {
  static unsigned long drawnAt = 0;
  if (millis() - drawnAt < 500) return;
  drawnAt = millis();
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1); display.setCursor(0, 0);
  display.println("ESP32 MONITOR");
  display.setTextSize(2); display.setCursor(0, 24);
  display.print(readTemperature(), 1);
  display.println(" C");
  display.display();
}
