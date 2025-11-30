const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const os = require("os");

const app = express();
const port = 3000;

// Open or create DB
const db = new Database("sensors.db");
db.pragma("journal_mode = WAL");

// Single table for latest values
db.exec(`
  CREATE TABLE IF NOT EXISTS sensors (
    id TEXT PRIMARY KEY,
    value REAL NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS percent (
      id TEXT PRIMARY KEY,
      value REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );
`);

// Prepared statements
const upsert = db.prepare(`
  INSERT INTO sensors (id, value, updated_at)
  VALUES (@id, @value, @ts)
  ON CONFLICT(id) DO UPDATE SET
    value = excluded.value,
    updated_at = excluded.updated_at
`);

const selectAll = db.prepare(`
  SELECT id, value, updated_at FROM sensors ORDER BY id
`);

const upsertPercent = db.prepare(`
    INSERT INTO percent (id, value, updated_at)
    VALUES (@id, @value, @ts)
    ON CONFLICT(id) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);

const selectPercentAll = db.prepare(`
    SELECT id, value FROM percent ORDER BY id
`);

app.use(cors());
app.use(express.json());

app.get("/sensors", (_req, res) => {
    const rows = selectAll.all();
    // Return as simple map: { sensor1: 0.5, ... }
    const map = Object.fromEntries(rows.map((r) => [r.id, r.value]));
    res.json(map);
});

app.post("/percent", (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Invalid JSON body" });
    }

    const ts = Math.floor(Date.now() / 1000);
    let changes = 0;

    if (typeof body.id === "string" && typeof body.value === "number") {
        upsertPercent.run({ id: body.id, value: body.value, ts });
        changes++;
    } else if (!Array.isArray(body)) {
        for (const [k, v] of Object.entries(body)) {
            if (typeof v === "number") {
                upsertPercent.run({ id: k, value: v, ts });
                changes++;
            }
        }
    }

    if (!changes) {
        return res
            .status(400)
            .json({ error: "No numeric sensor values found in body" });
    }

    const rows = selectPercentAll.all();
    const map = Object.fromEntries(rows.map((r) => [r.id, r.value]));
    res.json({ ok: true, percent: map });
})

app.get("/percent", (req, res) => {
    const rows = selectPercentAll.all();
    const map = Object.fromEntries(rows.map((r) => [r.id, r.value]));
    res.json(map);
})

app.post("/sensors", (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Invalid JSON body" });
    }

    const ts = Math.floor(Date.now() / 1000);
    let changes = 0;

    // Shape A: { "id": "sensor1", "value": 0.5 }
    if (typeof body.id === "string" && typeof body.value === "number") {
        upsert.run({ id: body.id, value: body.value, ts });
        changes++;
    } else if (!Array.isArray(body)) {
        // Shape B: { "sensor1": 0.5, "sensor2": 0.1 }
        for (const [k, v] of Object.entries(body)) {
            if (typeof v === "number") {
                upsert.run({ id: k, value: v, ts });
                changes++;
            }
        }
    }

    if (!changes) {
        return res
            .status(400)
            .json({ error: "No numeric sensor values found in body" });
    }

    const rows = selectAll.all();
    const map = Object.fromEntries(rows.map((r) => [r.id, r.value]));
    res.json({ ok: true, sensors: map });
});

function getLocalIP() {
    const nifs = os.networkInterfaces();
    for (const name in nifs) {
        for (const it of nifs[name] || []) {
            if (it.family === "IPv4" && !it.internal) return it.address;
        }
    }
    return "localhost";
}

app.listen(port, "0.0.0.0", () => {
    console.log(`SQLite server on http://${getLocalIP()}:${port}`);
});
