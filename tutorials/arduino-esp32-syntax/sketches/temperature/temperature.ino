#include <Arduino.h>
float readTemperature() {
  return (analogReadMilliVolts(35) - 500.0f) / 10.0f;
}

void setup() {
  Serial.begin(115200);
  pinMode(23, OUTPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(35, ADC_11db);
}

void loop() {
  float temperatureC = readTemperature();
  digitalWrite(23, temperatureC >= 30);
  Serial.printf("%.1f C\n", temperatureC);
  delay(200);
}
