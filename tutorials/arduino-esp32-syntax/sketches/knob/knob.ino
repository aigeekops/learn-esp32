#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(34, ADC_11db);
}

void loop() {
  int raw = analogRead(34);
  Serial.printf("ADC1 GPIO34 = %d\n", raw);
  delay(100);
}
