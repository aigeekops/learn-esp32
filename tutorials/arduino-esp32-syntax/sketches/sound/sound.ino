#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  ledcAttach(25, 2000, 10);
}

void loop() {
  unsigned long phase = millis() % (100 + 900);
  ledcWriteTone(25, phase < 100 ? 2000 : 0);
}
