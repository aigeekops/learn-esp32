#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  pinMode(23, OUTPUT);
}

void loop() {
  static bool lit = false;
  static unsigned long count = 0;
  lit = !lit;
  digitalWrite(23, lit);
  Serial.printf("count=%lu GPIO23=%d\n", count++, lit);
  delay(500);
}
