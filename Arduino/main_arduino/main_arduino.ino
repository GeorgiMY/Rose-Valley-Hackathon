#include <SoftwareSerial.h>
static const uint8_t ARD_RX = 10;
static const uint8_t ARD_TX = 11;
static const uint8_t SENSOR_PIN = A0;
SoftwareSerial esp(ARD_RX, ARD_TX);
static const float VREF = 5.0f;
static const int ADC_MAX = 1023;
static const float DRY_V = 2.90f;
static const float WET_V = 1.30f;

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
  float den = WET_V - DRY_V;
  float norm = den != 0.0f ? (volts - DRY_V) / den : 0.0f;
  if (norm < 0.0f) norm = 0.0f;
  if (norm > 1.0f) norm = 1.0f;
  float pct = norm * 100.0f;

  Serial.print("raw=");
  Serial.print(raw);
  Serial.print(" volts=");
  Serial.print(volts, 3);
  Serial.print(" pct=");
  Serial.println(pct, 1);

  esp.print("MOIST ");
  esp.print(raw);
  esp.print(' ');
  esp.println(volts, 3);

  while (esp.available()) {
    Serial.write(esp.read());
  }
  delay(300);
}