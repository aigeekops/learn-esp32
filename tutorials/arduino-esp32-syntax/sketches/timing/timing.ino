#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  pinMode(23, OUTPUT);
  pinMode(27, INPUT_PULLUP);
  analogReadResolution(12);
  analogSetPinAttenuation(34, ADC_11db);
}

void loop() {
  static unsigned long toggledAt = 0, sampledAt = 0;
  static bool lit = false;
  unsigned long now = millis();
  if (now - toggledAt >= 500) {
    toggledAt = now; lit = !lit;
    digitalWrite(23, lit);
  }
  if (now - sampledAt >= 500) {
    sampledAt = now;
    Serial.printf("ADC=%d\n", analogRead(34));
  }
  static int previous = HIGH;
  int button = digitalRead(27);
  if (button != previous) {
    previous = button;
    Serial.printf("BUTTON=%d\n", button);
  }
}
