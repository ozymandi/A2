import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from 'react-native-error-boundary';

import LoginScreen from './src/screens/LoginScreen';
import BuilderScreen from './src/screens/BuilderScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ModelSelectorScreen from './src/screens/ModelSelectorScreen';
import { theme } from './src/constants/theme';

const Stack = createNativeStackNavigator();

const CustomFallback = (props: { error: Error, resetError: Function }) => (
  <SafeAreaProvider>
    <View style={{ flex: 1, backgroundColor: '#000', padding: 20, justifyContent: 'center' }}>
      <Text style={{ color: 'red', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>APP CRASHED</Text>
      <ScrollView style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'monospace' }}>
          {props.error.toString()}
        </Text>
        <Text style={{ color: '#aaa', fontSize: 10, fontFamily: 'monospace', marginTop: 10 }}>
          {props.error.componentStack}
        </Text>
      </ScrollView>
    </View>
  </SafeAreaProvider>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('USER_INFO');
      if (userInfoStr) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogoutSuccess = () => {
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={CustomFallback}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            id="RootStack"
            screenOptions={{
              headerStyle: {
                backgroundColor: theme.colors.card,
              },
              headerTintColor: theme.colors.text,
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          >
            {!isAuthenticated ? (
              <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                options={{ headerShown: false }}
                initialParams={{ onLoginSuccess: handleLoginSuccess }}
              />
            ) : (
              <Stack.Group>
                <Stack.Screen 
                  name="Builder" 
                  component={BuilderScreen} 
                  options={{ title: 'Prompt Builder' }}
                />
                <Stack.Screen 
                  name="Settings" 
                  component={SettingsScreen} 
                  options={{ title: 'Settings' }}
                  initialParams={{ onLogoutSuccess: handleLogoutSuccess }}
                />
                <Stack.Screen 
                  name="ModelSelector" 
                  component={ModelSelectorScreen} 
                  options={{ title: 'Select Model', presentation: 'modal' }}
                />
              </Stack.Group>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
