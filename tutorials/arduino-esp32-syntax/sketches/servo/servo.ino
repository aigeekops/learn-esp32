#include <Arduino.h>
// Servo supply: separate regulated 5 V, common GND.

void setup() {
  Serial.begin(115200);
  ledcAttach(18, 50, 16);
}

void loop() {
  const int pulseUs = 1500;
  uint32_t duty = lround(pulseUs * 65536.0 / 20000.0);
  ledcWrite(18, duty);
  delay(20);
}
