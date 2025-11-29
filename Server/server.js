const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const app = express();
const port = 3000;

// Allow all origins (CORS)
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Serve the JSON data when a GET request is made to /sensors
app.get('/sensors', (req, res) => {
    const sensorsPath = path.join(__dirname, 'sensors.json');

    // Read and send the JSON file
    fs.readFile(sensorsPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading sensors file:', err);
            return res.status(500).send('Error reading sensors data');
        }
        res.json(JSON.parse(data)); // Send the JSON data
    });
});

// Handle POST request to update the sensors data
app.post('/sensors', (req, res) => {
    const newData = req.body;  // The data sent in the POST request

    const sensorsPath = path.join(__dirname, 'sensors.json');

    // Read the existing data from sensors.json
    fs.readFile(sensorsPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading sensors file:', err);
            return res.status(500).send('Error reading sensors data');
        }

        // Parse the existing JSON data
        const sensors = JSON.parse(data);

        const updatedSensors = sensors.map(sensor => {
            if (sensor.id === newData.id) {
                return { ...sensor, ...newData }; // Update the sensor with the new data
            }
            return sensor;
        });

        // Write the updated data back to the JSON file
        fs.writeFile(sensorsPath, JSON.stringify(updatedSensors, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Error writing to sensors file:', err);
                return res.status(500).send('Error saving updated sensors data');
            }
            res.status(200).send('Sensors data updated successfully');
        });
    });
});

// Get the local IP address of the machine
const getLocalIP = () => {
    const interfaces = os.networkInterfaces();
    for (const iface in interfaces) {
        for (const alias of interfaces[iface]) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
};

// Start the server
app.listen(port, '0.0.0.0', () => {
    const localIP = getLocalIP(); // Get local IP of the machine
    console.log(`Server is running at http://${localIP}:${port}`);
});
