#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

static const char* SSID     = "Pochti Incognitonation";
static const char* PASS     = "12345678";
static const char* POST_URL = "https://www.waterwise.live/sensors";

static const int RX2_PIN    = 16;
static const int TX2_PIN    = 17;

WiFiClientSecure tls;

bool connectWiFi(uint32_t timeoutMs = 20000) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  Serial.print("WiFi connecting");
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi connected, IP: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }
  Serial.println("WiFi connect failed");
  return false;
}

static inline bool isNumChar(char c) {
  return (c >= '0' && c <= '9') || c == '.' || c == '-' || c == '+';
}

bool parseLastNumber(const String& line, float& out) {
  String token;
  bool found = false;
  for (size_t i = 0; i < line.length(); ++i) {
    char c = line[i];
    if (isNumChar(c)) {
      token += c;
    } else if (token.length()) {
      out = token.toFloat();
      found = true;
      token = "";
    }
  }
  if (token.length()) {
    out = token.toFloat();
    found = true;
  }
  return found;
}

bool postSensorValue(float value) {
  tls.setInsecure();

  HTTPClient http;
  if (!http.begin(tls, POST_URL)) {
    Serial.println("http.begin failed");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "esp32-waterwise/1.0");

  String body = String("{\"sensor1\": ") + String(value, 3) + "}";

  int code = http.POST(body);
  String resp = http.getString();
  http.end();

  Serial.printf("POST %s -> %d, body=%s\n", POST_URL, code, body.c_str());
  if (resp.length()) {
    Serial.printf("Resp (%d bytes): %s\n", resp.length(), resp.c_str());
  }

  return code > 0 && code < 400;
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RX2_PIN, TX2_PIN);
  Serial2.setTimeout(200);
  Serial.println("ESP32 ready");

  connectWiFi();
}

void loop() {
  if (Serial2.available()) {
    String line = Serial2.readStringUntil('\n');
    line.trim();
    
    if (!line.length()) return;
    
    Serial.printf("From Arduino: %s\n", line.c_str());

    float value;
    if (parseLastNumber(line, value)) {
      if (WiFi.status() != WL_CONNECTED) {
        connectWiFi();
      }
      
      postSensorValue(value);
    } else {
      Serial.println("No numeric value found; skipping POST");
    }
  }
}