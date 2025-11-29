#include <SoftwareSerial.h>

static const uint8_t ARD_RX = 10;
static const uint8_t ARD_TX = 11;
static const uint8_t SENSOR_PIN = A0;

SoftwareSerial esp(ARD_RX, ARD_TX);

static const float VREF = 5.0f;
static const int ADC_MAX = 1023;

int readMoistureRaw(uint8_t samples = 10) {
  long sum = 0;
  for (uint8_t i = 0; i < samples; ++i) {
    sum += analogRead(SENSOR_PIN);
    delay(5);
  }
  return (int)(sum / samples);
}

void setup() {
  Serial.begin(9600);
  esp.begin(9600);
  Serial.println("Arduino ready");
}

void loop() {
  int raw = readMoistureRaw();
  float volts = (raw * VREF) / ADC_MAX;

  Serial.print("raw=");
  Serial.print(raw);
  Serial.print(" volts=");
  Serial.println(volts, 3);

  esp.print("MOIST ");
  esp.print(raw);
  esp.print(' ');
  esp.println(volts, 3);

  while (esp.available()) {
    Serial.write(esp.read());
  }

  delay(100);
}