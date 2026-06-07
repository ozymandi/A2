import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, Check } from 'lucide-react-native';
import { fetchAvailableModels, SELECTED_MODEL_STORAGE_KEY } from '../services/llmService';
import { theme } from '../constants/theme';

export default function ModelSelectorScreen({ route, navigation }: any) {
  const { engine, apiKey, currentModel } = route.params;
  
  const [models, setModels] = useState<string[]>([]);
  const [filteredModels, setFilteredModels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const fetchedModels = await fetchAvailableModels(engine, apiKey);
      setModels(fetchedModels);
      setFilteredModels(fetchedModels);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredModels(models);
    } else {
      const lowerQuery = query.toLowerCase();
      setFilteredModels(models.filter(m => m.toLowerCase().includes(lowerQuery)));
    }
  };

  const handleSelect = async (model: string) => {
    try {
      await AsyncStorage.setItem(SELECTED_MODEL_STORAGE_KEY, model);
      // Navigate back to Settings
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save model selection.');
    }
  };

  const renderItem = ({ item }: { item: string }) => {
    const isSelected = item === currentModel;
    return (
      <TouchableOpacity 
        style={[styles.modelItem, isSelected && styles.modelItemActive]}
        onPress={() => handleSelect(item)}
      >
        <Text style={[styles.modelText, isSelected && styles.modelTextActive]}>{item}</Text>
        {isSelected && <Check color={theme.colors.textMuted} size={20} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search color="#6B7280" size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${engine} models...`}
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading models...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredModels}
          keyExtractor={(item) => item}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No models found matching "{searchQuery}"</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    margin: 16,
    borderRadius: theme.radii.shell,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    paddingVertical: 14,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: theme.radii.shell,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  modelItemActive: {
    backgroundColor: 'rgba(24, 160, 251, 0.1)',
    borderColor: theme.colors.primary,
  },
  modelText: {
    color: theme.colors.text,
    fontSize: 15,
    flex: 1,
  },
  modelTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textMuted,
    marginTop: 12,
    fontSize: 15,
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  }
});
