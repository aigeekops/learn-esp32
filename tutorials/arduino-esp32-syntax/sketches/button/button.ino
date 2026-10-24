#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  pinMode(23, OUTPUT);
  pinMode(27, INPUT_PULLUP);
}

void loop() {
  bool pressed = digitalRead(27) == LOW;
  bool lit = pressed != bool(0);
  digitalWrite(23, lit);
  delay(1);
}
