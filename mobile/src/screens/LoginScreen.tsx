import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { theme } from '../constants/theme';
import { Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Use the actual Web Client ID from Google Cloud Console
const WEB_CLIENT_ID = '1096782583182-11m0pj9e55s527lc8tsfdnp39uojs11o.apps.googleusercontent.com';

export default function LoginScreen({ navigation, route }: any) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  // App.tsx passes this function as a parameter to update the root navigation state
  const onLoginSuccess = route.params?.onLoginSuccess;

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // Save user info locally
      await AsyncStorage.setItem('USER_INFO', JSON.stringify(userInfo));
      
      if (onLoginSuccess) {
        onLoginSuccess(userInfo);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Operation already in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Play services not available or outdated.');
      } else {
        // Developer error (likely missing or wrong Client ID)
        if (WEB_CLIENT_ID === ('YOUR_WEB_CLIENT_ID' as string)) {
          Alert.alert(
            'Configuration Needed',
            'Please update the WEB_CLIENT_ID in LoginScreen.tsx to your actual Google Cloud Web Client ID.'
          );
        } else {
          Alert.alert('Login Error', error.message || 'An error occurred during sign in.');
        }
        console.error(error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Mock Login for development/testing without actual Google Configuration
  const handleMockSignIn = async () => {
    setIsSigningIn(true);
    setTimeout(async () => {
      const mockUser = {
        user: {
          name: "Test User",
          email: "test@example.com",
          id: "12345"
        }
      };
      await AsyncStorage.setItem('USER_INFO', JSON.stringify(mockUser));
      if (onLoginSuccess) {
        onLoginSuccess(mockUser);
      }
      setIsSigningIn(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.iconWrapper}>
          <Sparkles color="#fff" size={48} />
        </View>
        <Text style={styles.appName}>O'Bend</Text>
        <Text style={styles.appSubtitle}>Prompt Engineering Node UI</Text>
      </View>

      <View style={styles.authContainer}>
        <TouchableOpacity 
          style={styles.googleBtn} 
          onPress={handleGoogleSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? (
            <ActivityIndicator color={theme.colors.text} size="small" />
          ) : (
            <Text style={styles.googleBtnText}>Sign in with Google</Text>
          )}
        </TouchableOpacity>

        {/* Temporary mock button for easy testing without keys */}
        <TouchableOpacity 
          style={styles.mockBtn} 
          onPress={handleMockSignIn}
          disabled={isSigningIn}
        >
          <Text style={styles.mockBtnText}>Mock Login (Testing)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  iconWrapper: {
    backgroundColor: theme.colors.primary,
    padding: 20,
    borderRadius: 30,
    marginBottom: 20,
    ...theme.shadows.node,
    shadowColor: theme.colors.primary,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 2,
  },
  appSubtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  authContainer: {
    width: '100%',
    gap: 16,
  },
  googleBtn: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
    borderRadius: theme.radii.shell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  mockBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockBtnText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textDecorationLine: 'underline',
  }
});
