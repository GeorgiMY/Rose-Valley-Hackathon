#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, 16, 17);
  Serial2.setTimeout(200);
  Serial.println("ESP32 ready");
}

void loop() {
  if (Serial2.available()) {
    String line = Serial2.readStringUntil('\n');
    line.trim();
    if (line.length()) {
      Serial.printf("From Arduino: %s\n", line.c_str());
      // Later you'll parse this and make HTTP requests
    }
  }
}