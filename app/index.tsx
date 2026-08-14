import { router } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, } from 'react-native';


export default function HomeScreen({ navigation }:any) {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f9ca0a" barStyle="dark-content" />
      <Text style={styles.title}>Bem-vindo ao ChickSafe!</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.navigate("/(auth)/login/page")}>
        <Text style={styles.buttonText}>Fazer Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonSecondary} onPress={() => router.navigate("/(auth)/cadastro/page")}>
        <Text style={styles.buttonSecondaryText}>Criar Conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9ca0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 50,
    textAlign: 'center'
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 20
  },
  buttonText: {
    color: '#f9ca0a',
    fontSize: 18,
    fontWeight: '600'
  },
  buttonSecondary: {
    borderWidth: 2,
    borderColor: '#333',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10
  },
  buttonSecondaryText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600'
  }
});
