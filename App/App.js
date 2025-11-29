import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';

// Function to get color based on humidity
const getHumidityColor = (humidity) => {
  if (humidity < 40) return '#4caf50'; // Green
  if (humidity < 60) return '#fde400ff'; // Yellow
  return '#f44336'; // Red
};

// Arduino Module Card Component
const ArduinoModuleCard = ({
  id,
  initialHumidity,
  onPress,
  onSavePress,
}) => {
  const [humidity, setHumidity] = useState(initialHumidity);
  const humidityColor = getHumidityColor(humidity);

  // Increase humidity
  const increaseHumidity = () => {
    setHumidity((prevHumidity) => Math.min(prevHumidity + 1, 100)); // Cap at 100%
  };

  // Decrease humidity
  const decreaseHumidity = () => {
    setHumidity((prevHumidity) => Math.max(prevHumidity - 1, 0)); // Min at 0%
  };

  // Save the updated humidity to the parent component
  const handleSavePress = () => {
    // Pass the updated humidity to the parent
    onSavePress(id, humidity);
    Alert.alert('Success', `Humidity for ${id} updated to ${humidity}%`);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { borderColor: humidityColor }]}
    >
      <Text style={styles.id}>Module ID: {id}</Text>
      <View style={styles.humidityContainer}>
        <TouchableOpacity onPress={decreaseHumidity} style={styles.adjustButton}>
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>

        <Text style={[styles.humidity, { color: humidityColor }]}>{humidity}%</Text>

        <TouchableOpacity onPress={increaseHumidity} style={styles.adjustButton}>
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Save button */}
      <TouchableOpacity onPress={handleSavePress} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// Main App Component
export default function App() {
  // State to hold the modules
  const [arduinoModules, setArduinoModules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch sensor data from the server
  const fetchSensorData = async () => {
    try {
      // Use the correct URL based on the platform (Android Emulator or Physical Device)
      const apiUrl =
        Platform.OS === 'android'
          ? 'http://172.29.32.1:3000'  // For Android Emulator
          : 'http://localhost:3000/sensors'; // For iOS or other platforms

      const response = await fetch(apiUrl);
      console.log(response);
      const data = await response.json();
      setArduinoModules(data); // Update state with the fetched data
    } catch (error) {
      console.error('Error fetching data:', error);
      console.log(response);
    } finally {
      setLoading(false); // Set loading to false after data is fetched
    }
  };

  // Fetch the data when the component mounts
  useEffect(() => {
    fetchSensorData();
  }, []);

  // Example function to handle tapping on a module
  const handleModulePress = (module) => {
    Alert.alert(
      `Details for ${module.id}`,
      `Humidity: ${module.humidity}%`
    );
  };

  // Save button handler (update the humidity in the state)
  const handleSavePress = (moduleId, updatedHumidity) => {
    // Update the state with the new humidity value for the specific module
    setArduinoModules((prevModules) =>
      prevModules.map((module) =>
        module.id === moduleId
          ? { ...module, humidity: updatedHumidity }
          : module
      )
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Arduino Modules</Text>
      <FlatList
        data={arduinoModules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ArduinoModuleCard
            id={item.id}
            initialHumidity={item.humidity}
            onPress={() => handleModulePress(item)}
            onSavePress={handleSavePress} // Pass save handler to update the humidity
          />
        )}
      />
    </View>
  );
}

// Styling for the app
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  id: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  humidityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  humidity: {
    fontSize: 16,
    marginHorizontal: 20,
  },
  buttonText: {
    fontSize: 30,
    color: '#fff',
  },
  adjustButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    marginTop: 15,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});
