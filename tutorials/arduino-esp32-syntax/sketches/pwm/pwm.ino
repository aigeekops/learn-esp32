#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  ledcAttach(23, 5000, 8);
  ledcAttach(19, 5000, 8);
  ledcAttach(18, 5000, 8);
  analogReadResolution(12);
  analogSetPinAttenuation(34, ADC_11db);
}

void loop() {
  int value = analogRead(34);
  bool fromKnob = false;
  ledcWrite(23, fromKnob ? (value * 255L / 4095) : 255);
  ledcWrite(19, fromKnob ? (value * 255L / 4095) : 80);
  ledcWrite(18, fromKnob ? (value * 255L / 4095) : 20);
  delay(10);
}
