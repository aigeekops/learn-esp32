#include <Arduino.h>

int add(int left, int right) {
  return left + right;
}

int multiply(int value, int factor = 2) {
  return value * factor;
}

void changeCopy(int value) { value = 9; }
void changeOriginal(int& value) { value = 9; }

int sumValues(const int* values, size_t count) {
  int sum = 0;
  for (size_t i = 0; i < count; i++) sum += values[i];
  return sum;
}

struct Reading {
  float temperatureC;
  bool valid;
};

enum class Mode { Stopped, Running };

class Counter {
public:
  Counter(int start) : value(start) {}
  void increment() { value++; }
  int current() const { return value; }
private:
  int value;
};

void announce() { Serial.println("callback=ready"); }
void runAction(void (*action)()) { action(); }

void setup() {
  Serial.begin(115200);
  Serial.println("SYNTAX LAB");
  Serial.printf("add=%d default=%d\n", add(3, 4), multiply(3));

  int x = 3;
  changeCopy(x);
  Serial.printf("copy=%d\n", x);
  changeOriginal(x);
  Serial.printf("reference=%d\n", x);

  int readings[] = {10, 20, 30};
  size_t count = sizeof(readings) / sizeof(readings[0]);
  Serial.printf("array_sum=%d\n", sumValues(readings, count));

  int* pointer = &x;
  *pointer = 4;
  Serial.printf("pointer=%d\n", x);

  Counter clicks(0);
  clicks.increment();
  Serial.printf("object=%d\n", clicks.current());

  Reading current = {25.5f, true};
  Mode mode = Mode::Running;
  Serial.printf("reading=%.1f valid=%d running=%d\n",
                current.temperatureC, current.valid, mode == Mode::Running);

  String message = String("value=") + 30;
  Serial.println(message);
  Serial.printf("string_length=%u\n", static_cast<unsigned int>(message.length()));

  int limit = 30;
  auto saved = [limit](int value) { return value >= limit; };
  limit = 40;
  Serial.printf("captured=%d\n", saved(35));
  runAction(announce);
  runAction([]() { Serial.println("lambda=ready"); });

  for (int i = 0; i < 4; i++) {
    if (i == 1) continue;
    Serial.printf("loop=%d\n", i);
  }
  Serial.println("END");
}

void loop() {}
