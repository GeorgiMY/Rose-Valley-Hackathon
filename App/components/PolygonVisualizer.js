import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Dimensions } from 'react-native';
import Svg, { Polygon, Circle, G } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_SIZE = SCREEN_WIDTH - 40;
const CENTER = CANVAS_SIZE / 2;

const PolygonVisualizer = ({ onBack }) => {
  const [numSides, setNumSides] = useState('5');
  const [sideLengths, setSideLengths] = useState(['10', '12', '15', '7', '9']);
  const [polygonPoints, setPolygonPoints] = useState(null);
  const [error, setError] = useState(null);

  // Update number of sides and reset lengths array
  const handleNumSidesChange = (text) => {
    setNumSides(text);
    const n = parseInt(text);
    if (!isNaN(n) && n >= 3) {
      // Preserve existing values if possible, else fill with empty strings
      const newLengths = Array(n).fill('').map((_, i) => sideLengths[i] || '');
      setSideLengths(newLengths);
    }
  };

  // Update specific side length
  const handleLengthChange = (text, index) => {
    const newLengths = [...sideLengths];
    newLengths[index] = text;
    setSideLengths(newLengths);
  };

  // Calculate Cyclic Polygon Vertices
  const calculatePolygon = () => {
    setError(null);
    const lengths = sideLengths.map(l => parseFloat(l));

    // Validation
    if (lengths.some(l => isNaN(l) || l <= 0)) {
      setError('Please enter valid positive numbers for all side lengths.');
      return;
    }
    if (lengths.length < 3) {
      setError('A polygon must have at least 3 sides.');
      return;
    }

    const maxSide = Math.max(...lengths);
    const sumOthers = lengths.reduce((a, b) => a + b, 0) - maxSide;

    if (maxSide >= sumOthers) {
      setError(`Impossible polygon! The longest side (${maxSide}) must be shorter than the sum of the other sides (${sumOthers}).`);
      return;
    }

    // Binary Search for Circumradius R
    let low = maxSide / 2 + 0.00001;
    let high = 100000; // Large enough start
    let R = low;
    let iterations = 0;

    while (iterations < 100) {
      R = (low + high) / 2;
      let angleSum = 0;
      for (let s of lengths) {
        // Safety for asin domain
        const val = s / (2 * R);
        if (val > 1) {
          angleSum = Infinity; // R is too small
          break;
        }
        angleSum += 2 * Math.asin(val);
      }

      const diff = angleSum - 2 * Math.PI;

      if (Math.abs(diff) < 1e-6) break;

      if (diff > 0) {
        low = R;
      } else {
        high = R;
      }
      iterations++;
    }

    // Scale to fit canvas
    const padding = 40;
    let scale = (CANVAS_SIZE - padding) / (2 * R);

    // Calculate vertices
    const scaledPoints = [];
    let currentAngle = -Math.PI / 2; // Start from top

    for (let s of lengths) {
      const scaledR = R * scale;
      const x = CENTER + scaledR * Math.cos(currentAngle);
      const y = CENTER + scaledR * Math.sin(currentAngle);
      scaledPoints.push(`${x},${y}`);

      const theta = 2 * Math.asin(s / (2 * R));
      currentAngle += theta;
    }

    setPolygonPoints(scaledPoints.join(' '));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Polygon Visualizer</Text>
      </View>

      {/* Controls Container (Top) */}
      <View style={styles.controlsContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Number of Sides:</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={numSides}
            onChangeText={handleNumSidesChange}
          />
        </View>

        <Text style={styles.label}>Side Lengths:</Text>
        <View style={styles.lengthsContainer}>
          {sideLengths.map((len, index) => (
            <View key={index} style={styles.lengthInputWrapper}>
              <Text style={styles.lengthLabel}>Side {index + 1}:</Text>
              <TextInput
                style={styles.lengthInput}
                keyboardType="numeric"
                value={len}
                onChangeText={(text) => handleLengthChange(text, index)}
                placeholder="0"
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={calculatePolygon}>
          <Text style={styles.buttonText}>Visualize</Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Visualization Container (Bottom) */}
      <View style={styles.canvasContainer}>
        {polygonPoints ? (
          <Svg height={CANVAS_SIZE} width={CANVAS_SIZE} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
            <Polygon
              points={polygonPoints}
              fill="rgba(76, 175, 80, 0.3)"
              stroke="#4caf50"
              strokeWidth="3"
            />
          </Svg>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Enter lengths and click Visualize</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  backButtonText: {
    fontSize: 18,
    color: '#007bff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  canvasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: CANVAS_SIZE,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  controlsContainer: {
    // Container for inputs and button
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    width: 60,
    fontSize: 16,
    textAlign: 'center',
  },
  lengthsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  lengthInputWrapper: {
    width: '30%',
    marginRight: '3%',
    marginBottom: 10,
  },
  lengthLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  lengthInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#f44336',
    marginBottom: 10,
    textAlign: 'center',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  placeholderText: {
    color: '#aaa',
  }
});

export default PolygonVisualizer;
