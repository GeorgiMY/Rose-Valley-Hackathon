import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
        {/* Decrease humidity with icon */}
        <TouchableOpacity onPress={decreaseHumidity} style={styles.adjustButton}>
          <Ionicons name="remove" size={30} color="#fff" />
        </TouchableOpacity>

        {/* Display humidity */}
        <Text style={[styles.humidity, { color: humidityColor }]}>{humidity}%</Text>

        {/* Increase humidity with icon */}
        <TouchableOpacity onPress={increaseHumidity} style={styles.adjustButton}>
          <Ionicons name="add" size={30} color="#fff" />
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
  const [arduinoModules, setArduinoModules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch sensor data from the server
  const fetchSensorData = async () => {
    try {
      /*const apiUrl =
        Platform.OS === 'android'
          ? 'http://172.29.32.1:3000'  // For Android Emulator
          : 'http://localhost:3000/sensors';*/ // For iOS or other platforms

      const response = await fetch('https://waterwise.live/sensors');
      const data = await response.json();
      setArduinoModules(data); // Update state with the fetched data
    } catch (error) {
      console.error('Error fetching data:', error);
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
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image
          source={require('./assets/waterwise-logo.png')}  // Adjust the path as needed
          style={styles.logo}
        />
        <Text style={styles.headerTitle}>WaterWise</Text>
      </View>

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
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 120, // Adjust size
    height: 120, // Adjust size
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4caf50', // Adjust color to match the logo theme
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
