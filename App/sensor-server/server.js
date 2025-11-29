const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const app = express();
const port = 3000;

// Allow all origins (CORS)
app.use(cors());

// Serve the JSON data when a GET request is made to /sensors
app.get('/sensors', (req, res) => {
  // Ensure your `sensors.json` file is in the same directory as this server file
  res.sendFile(path.join(__dirname, 'sensors.json'));
});

// Get the local IP address of the machine
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const interface in interfaces) {
    for (const alias of interfaces[interface]) {
      // Filter for the first non-internal IP address (IPv4)
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost'; // Default to 'localhost' if no external IP is found
};

// Start the server
app.listen(port, '0.0.0.0', () => {
  const localIP = getLocalIP(); // Get local IP of the machine
  console.log(`Server is running at http://${localIP}:${port}`);
});
