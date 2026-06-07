import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyRound, CheckCircle2, ExternalLink, ChevronRight, LogOut, User } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../constants/theme';

let GoogleSignin: any = { signOut: async () => {} };
// The native module import is fully removed to prevent Metro cache issues

import {
  API_KEY_STORAGE_KEY, 
  ENGINE_STORAGE_KEY,
  SELECTED_MODEL_STORAGE_KEY
} from '../services/llmService';

export default function SettingsScreen({ navigation, route }: any) {
  const [apiKey, setApiKey] = useState('');
  const [engine, setEngine] = useState('Groq'); // Groq, Gemini, or OpenRouter
  const [isSaved, setIsSaved] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const onLogoutSuccess = route.params?.onLogoutSuccess;

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const storedKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
      const storedEngine = await AsyncStorage.getItem(ENGINE_STORAGE_KEY);
      const storedModel = await AsyncStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
      const userStr = await AsyncStorage.getItem('USER_INFO');
      
      if (storedKey) setApiKey(storedKey);
      if (storedEngine) setEngine(storedEngine);
      if (storedModel) setSelectedModel(storedModel);
      if (userStr) setUserInfo(JSON.parse(userStr));
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const handleOpenSelector = () => {
    if (!apiKey.trim()) {
      Alert.alert('Missing API Key', 'Please enter your API key first before selecting a model.');
      return;
    }
    // Save current settings first so they aren't lost
    saveSettings();
    navigation.navigate('ModelSelector', { engine, apiKey: apiKey.trim(), currentModel: selectedModel });
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      await AsyncStorage.setItem(ENGINE_STORAGE_KEY, engine);
      await AsyncStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModel);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  const openKeyUrl = () => {
    let url = 'https://console.groq.com/keys';
    if (engine === 'Gemini') {
      url = 'https://aistudio.google.com/app/apikey';
    } else if (engine === 'OpenRouter') {
      url = 'https://openrouter.ai/keys';
    }
    Linking.openURL(url);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear async storage info
      await AsyncStorage.removeItem('USER_INFO');
      
      // Attempt google sign out (might fail if mock user or not configured)
      try {
        await GoogleSignin.signOut();
      } catch(e) {}
      
      if (onLogoutSuccess) {
        onLogoutSuccess();
      }
    } catch (e) {
      Alert.alert('Logout Error', 'Failed to log out.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <KeyRound color={theme.colors.textMuted} size={24} />
          <Text style={styles.title}>API Key Configuration</Text>
        </View>
        <Text style={styles.subtitle}>
          Enter your API key to enable prompt generation. Your key is stored securely on this device and never sent anywhere else.
        </Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Engine</Text>
          <View style={styles.row}>
            <TouchableOpacity 
              style={[styles.engineButton, engine === 'Groq' && styles.engineButtonActive]}
              onPress={() => setEngine('Groq')}
            >
              <Text style={[styles.engineText, engine === 'Groq' && styles.engineTextActive]}>Groq</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.engineButton, engine === 'OpenRouter' && styles.engineButtonActive]}
              onPress={() => setEngine('OpenRouter')}
            >
              <Text style={[styles.engineText, engine === 'OpenRouter' && styles.engineTextActive]}>OpenRouter</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.engineButton, engine === 'Gemini' && styles.engineButtonActive]}
              onPress={() => setEngine('Gemini')}
            >
              <Text style={[styles.engineText, engine === 'Gemini' && styles.engineTextActive]}>Gemini</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>API Key</Text>
          <View style={styles.inputWrapper}>
            <KeyRound color="#6B7280" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={`Enter your ${engine} API key`}
              placeholderTextColor="#6B7280"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={styles.linkButton} onPress={openKeyUrl}>
            <Text style={styles.linkText}>Get your free {engine} key here</Text>
            <ExternalLink color={theme.colors.textMuted} size={14} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Generation Model</Text>
          <TouchableOpacity style={styles.modelSelectButton} onPress={handleOpenSelector}>
            <Text style={styles.selectedModelText}>
              {selectedModel || 'Tap to select a model...'}
            </Text>
            <ChevronRight color={theme.colors.textMuted} size={20} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          {isSaved ? (
            <View style={styles.savedRow}>
              <CheckCircle2 color="#fff" size={20} />
              <Text style={styles.saveButtonText}>Saved!</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </View>

      {userInfo && (
        <View style={[styles.card, { marginTop: 24 }]}>
          <View style={styles.header}>
            <User color={theme.colors.textMuted} size={24} />
            <Text style={styles.title}>Account</Text>
          </View>
          <Text style={styles.subtitle}>
            Logged in as {userInfo.user?.email || userInfo.user?.name || 'Unknown User'}
          </Text>

          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <LogOut color="#fff" size={18} />
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.shell,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.node,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  engineButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
  },
  engineButtonActive: {
    backgroundColor: 'rgba(24, 160, 251, 0.1)',
    borderColor: theme.colors.primary,
  },
  engineText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  engineTextActive: {
    color: theme.colors.primary,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radii.control,
    padding: 14,
    paddingLeft: 40,
    color: theme.colors.text,
    fontSize: 16,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  modelSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radii.control,
    padding: 16,
  },
  selectedModelText: {
    color: theme.colors.text,
    fontSize: 16,
    flex: 1,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: theme.radii.shell,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radii.shell,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
