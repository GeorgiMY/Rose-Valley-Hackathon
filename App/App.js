import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PolygonVisualizer from './components/PolygonVisualizer';

const getHumidityColor = (humidity) => {
  if (humidity < 40) return '#4caf50'; 
  if (humidity < 60) return '#fde400'; 
  return '#f44336'; 
};

const ArduinoModuleCard = ({
  id,
  initialHumidity,
  desiredHumidity,
  onPress,
  onSavePress,
}) => {
  const [humidity, setHumidity] = useState(null); 

   useEffect(() => {
    if (desiredHumidity !== null) {
      setHumidity(desiredHumidity); 
    }
  }, [desiredHumidity]); 

  const humidityColor = getHumidityColor(humidity);

  const increaseHumidity = () => {
    setHumidity((prevHumidity) => Math.min(prevHumidity + 1, 100)); 
  };

  const decreaseHumidity = () => {
    setHumidity((prevHumidity) => Math.max(prevHumidity - 1, 0)); 
  };

  const handleSavePress = () => {
    onSavePress(id, humidity);
    Alert.alert('Success', `Humidity for ${id} updated to ${humidity}%`);
  };


  function voltsToNorm(v, dryV, wetV) {
    const den = wetV - dryV;
    if (!isFinite(den) || den === 0) return 0;
    return (v - dryV) / den;
  }

  function voltsToPercent(v, dryV, wetV) {
    return voltsToNorm(v, dryV, wetV) * 100;
  }

  return (
    <TouchableOpacity onPress={onPress} style={[styles.card, { borderColor: humidityColor }]}>
      <Text style={styles.id}>Module ID: {id} - Original humidity: {Math.fround(voltsToPercent(initialHumidity, 2.90, 1.30), 3)}%</Text>
      <View style={styles.humidityContainer}>
        <TouchableOpacity onPress={decreaseHumidity} style={styles.adjustButton}>
          <Ionicons name="remove" size={30} color="#fff" />
        </TouchableOpacity>

        <Text style={[styles.humidity, { color: humidityColor }]}>{humidity}%</Text>

        <TouchableOpacity onPress={increaseHumidity} style={styles.adjustButton}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleSavePress} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function App() {
  const [arduinoModules, setArduinoModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [desiredHumidity, setDesiredHumidity] = useState(null);
  const [initialHumidity, setInitialHumidity] = useState(null);

  const fetchSensorData = async () => {
    try {
      const response = await fetch('https://waterwise.live/sensors');
      const data = await response.json();

      if (data) {
        const modules = Object.keys(data).map(key => ({
          id: key,     
          humidity: data[key], 
          targetHumidity: desiredHumidity, 
        }));
        setArduinoModules(modules);
      } else {
        setArduinoModules([]);
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      setArduinoModules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDesiredHumidity = async () => {
  try {
    const response = await fetch('https://www.waterwise.live/percent');
    const data = await response.json();
    setDesiredHumidity(data.sensor1);
  } catch (error) {
    console.error('Error fetching desired humidity:', error);
  }
};

   useEffect(() => {
    fetchDesiredHumidity();
    fetchSensorData();
    const intervalId = setInterval(() => {
      fetchSensorData();
    }, 500);

    return () => clearInterval(intervalId);
  }, [desiredHumidity]);

  const handleSavePress = async (moduleId, updatedHumidity) => {
    try {
      const normalizedHumidity = updatedHumidity; 
      const response = await fetch('https://waterwise.live/percent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor1: normalizedHumidity,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setArduinoModules((prevModules) =>
          prevModules.map((module) =>
            module.id === moduleId
              ? { ...module, humidity: updatedHumidity }
              : module
          )
        );
        Alert.alert('Success', `Humidity for ${moduleId} updated to ${updatedHumidity}%`);
      } else {
        console.log(response);
        Alert.alert('Error', `Failed to update humidity for ${moduleId}`);
      }
    } catch (error) {
      console.error('Error saving humidity:', error);
      Alert.alert('Error', 'An error occurred while saving humidity data');
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#007bff" style={styles.loadingIndicator} />;
  }

  if (currentScreen === 'polygon') {
    return <PolygonVisualizer onBack={() => setCurrentScreen('home')} />;
  }

  if (arduinoModules.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noSensorsText}>No active sensors connected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('./assets/waterwise-logo.png')} style={styles.logo} />
        <Text style={styles.headerTitle}>WaterWise</Text>
      </View>

      <TouchableOpacity
        style={styles.toolButton}
        onPress={() => setCurrentScreen('polygon')}
      >
        <Text style={styles.toolButtonText}>Open Polygon Tool</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Sensor Modules</Text>

      <FlatList
        data={arduinoModules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ArduinoModuleCard
            id={item.id}
            initialHumidity={item.humidity}
            desiredHumidity={item.targetHumidity}
            onPress={() => console.log(item)}
            onSavePress={(id, updatedHumidity) => handleSavePress(id, updatedHumidity)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#e0f7fa',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#00796b',
  },
  card: {
    padding: 20,
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#00796b',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  id: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#00796b',
  },
  humidityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  humidity: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 20,
    color: '#00796b',
  },
  adjustButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    marginTop: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  toolButton: {
    backgroundColor: '#673ab7',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  toolButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSensorsText: {
    textAlign: 'center',
    fontSize: 24,
  },
});
