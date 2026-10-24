#include <Arduino.h>

unsigned long countedAt = 0;
unsigned long reportedAt = 0;
unsigned long count = 0;

void setup() {
  Serial.begin(115200);
}

void loop() {
  unsigned long now = millis();
  if (now - countedAt >= 500) {
    countedAt = now;
    count++;
  }
  if (now - reportedAt >= 1000) {
    reportedAt = now;
    Serial.printf("count=%lu\n", count);
  }
}
