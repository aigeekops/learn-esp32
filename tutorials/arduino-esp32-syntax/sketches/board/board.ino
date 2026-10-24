#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 ready");
}

void loop() {
  static unsigned long count = 0;
  Serial.printf("loop %lu\n", count++);
  delay(1000);
}
