#include <Arduino.h>
enum Alarm { NORMAL, ALARM, ACK };
Alarm state = NORMAL;
float temperatureC = 25;
int thresholdC = 30;
bool stable = false, candidate = false;
unsigned long changedAt = 0, sampledAt = 0;
float readTemperature() {
  return (analogReadMilliVolts(35) - 500.0f) / 10.0f;
}
void evaluateAlarm(bool press) {
  if (temperatureC < thresholdC) state = NORMAL;
  else if (state == NORMAL) state = ALARM;
  else if (state == ALARM && press) state = ACK;
  digitalWrite(23, state != NORMAL);
  ledcWriteTone(25, state == ALARM && millis() % 1000 < 100 ? 2000 : 0);
}
void updateAlarm(unsigned long now) {
  bool raw = digitalRead(27) == LOW;
  if (raw != candidate) { candidate = raw; changedAt = now; }
  bool press = false;
  if (now - changedAt >= 30 && stable != candidate) {
    stable = candidate; press = stable;
  }
  if (now - sampledAt >= 200) {
    sampledAt = now; temperatureC = readTemperature();
  }
  evaluateAlarm(press);
}

void setup() {
  Serial.begin(115200);
  pinMode(23, OUTPUT);
  pinMode(27, INPUT_PULLUP);
  analogReadResolution(12);
  analogSetPinAttenuation(35, ADC_11db);
  ledcAttach(25, 2000, 10);
}

void loop() {
  updateAlarm(millis());
  static unsigned long loggedAt = 0;
  if (millis() - loggedAt >= 500) {
    loggedAt = millis();
    Serial.printf("T=%.1f threshold=%d state=%d\n", temperatureC, thresholdC, state);
  }
}
