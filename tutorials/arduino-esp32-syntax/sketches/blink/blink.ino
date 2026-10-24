#include <Arduino.h>
// GPIO23 -> 330 ohm -> LED -> GND

void setup() {
  Serial.begin(115200);
  pinMode(23, OUTPUT);
}

void loop() {
  digitalWrite(23, HIGH);
  delay(500);
  digitalWrite(23, LOW);
  delay(500);
}
