#include <Arduino.h>

const int LED_PIN = 23;
bool ledOn = false;

void setLed(bool on) {
  ledOn = on;
  digitalWrite(LED_PIN, on ? HIGH : LOW);
}

void reportState() {
  Serial.println(ledOn ? "state=ON" : "state=OFF");
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  setLed(false);
  Serial.println("Send 1=ON, 0=OFF, ?=STATUS");
}

void loop() {
  if (Serial.available() == 0) return;
  int command = Serial.read();
  switch (command) {
    case '1':
      setLed(true);
      reportState();
      break;
    case '0':
      setLed(false);
      reportState();
      break;
    case '?':
      reportState();
      break;
    case '\r':
    case '\n':
      break;
    default:
      Serial.println("error: use 1, 0 or ?");
      break;
  }
}
