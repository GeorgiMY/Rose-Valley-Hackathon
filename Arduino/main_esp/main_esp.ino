#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

static const char* SSID = "Pochti Incognitonation";
static const char* PASS = "12345678";
static const char* POST_URL = "https://www.waterwise.live/sensors";
static const char* GET_URL = "https://www.waterwise.live/percent";

static const int RX2_PIN = 16;
static const int TX2_PIN = 17;

WiFiClientSecure tls;
unsigned long lastPoll = 0;
const unsigned long POLL_MS = 5000;  // poll /percent every 5s

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
    Serial.printf("WiFi connected, IP: %s\n",
                  WiFi.localIP().toString().c_str());
    return true;
  }
  Serial.println("WiFi connect failed");
  return false;
}

static inline bool isNumChar(char c) {
  return (c >= '0' && c <= '9') || c == '.' || c == '-' || c == '+';
}

// Parse the last number in a free-form line (for Arduino->ESP lines)
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

// Extract value for a key in a tiny JSON like {"sensor1": 0.5}
bool extractKeyNumber(const String& json, const char* key, float& out) {
  String needle = String("\"") + key + String("\"");
  int i = json.indexOf(needle);
  if (i < 0) return false;
  i = json.indexOf(':', i);
  if (i < 0) return false;
  String tok;
  for (int j = i + 1; j < (int)json.length(); ++j) {
    char c = json[j];
    if ((c >= '0' && c <= '9') || c == '.' || c == '-' || c == '+') {
      tok += c;
    } else if (tok.length()) {
      break;
    }
  }
  if (!tok.length()) return false;
  out = tok.toFloat();
  return true;
}

bool postSensorValue(float value) {
  tls.setInsecure();

  HTTPClient http;
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setTimeout(7000);

  if (!http.begin(tls, POST_URL)) {
    Serial.println("http.begin failed (POST)");
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

bool pollPercent(float& valueOut) {
  if (WiFi.status() != WL_CONNECTED) {
    if (!connectWiFi()) return false;
  }

  tls.setInsecure();

  HTTPClient http;
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setTimeout(7000);

  if (!http.begin(tls, GET_URL)) {
    Serial.println("http.begin failed (GET)");
    return false;
  }

  int code = http.GET();
  String body = http.getString();
  http.end();

  Serial.printf("GET %s -> %d\n", GET_URL, code);
  if (code <= 0 || code >= 400) return false;

  float v;
  if (!extractKeyNumber(body, "sensor1", v)) {
    Serial.println("sensor1 not found in /percent JSON");
    return false;
  }
  valueOut = v;
  return true;
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RX2_PIN, TX2_PIN);
  Serial2.setTimeout(200);
  Serial.println("ESP32 ready");
  connectWiFi();
}

void loop() {
  // 1) Handle incoming line from Arduino and POST it
  if (Serial2.available()) {
    String line = Serial2.readStringUntil('\n');
    line.trim();
    if (line.length()) {
      Serial.printf("From Arduino: %s\n", line.c_str());
      float value;
      if (parseLastNumber(line, value)) {
        postSensorValue(value);
      } else {
        Serial.println("No numeric value found; skipping POST");
      }
    }
  }

  unsigned long now = millis();
  if (now - lastPoll >= POLL_MS) {
    lastPoll = now;
    float pct;
    if (pollPercent(pct)) {
      Serial.printf("sensor1=%.3f (percent)\n", pct);
      Serial2.print("PCT ");
      Serial2.println(pct, 3); // Arduino will act on this
    }
  }
}