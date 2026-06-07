import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2, Sparkles } from 'lucide-react-native';
import { PromptBlock as IPromptBlock } from '../services/llmService';
import PresetSelectorModal from './PresetSelectorModal';
import { theme } from '../constants/theme';

interface Props {
  block: IPromptBlock;
  onChange: (id: string, newContent: string) => void;
  onRemove: (id: string) => void;
}

export default function PromptBlock({ block, onChange, onRemove }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const hasPresets = !['Subject', 'Custom'].includes(block.type);

  const handleSelectPreset = (preset: string) => {
    const newContent = block.content.trim() 
      ? `${block.content.trim()}, ${preset}`
      : preset;
    onChange(block.id, newContent);
    setModalVisible(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.typeText}>{block.type}</Text>
          {hasPresets && (
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.presetBtn}>
              <Sparkles color={theme.colors.textMuted} size={14} />
              <Text style={styles.presetBtnText}>Templates</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => onRemove(block.id)} style={styles.removeBtn}>
          <Trash2 color={theme.colors.textMuted} size={18} />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        multiline
        placeholder={`Describe the ${block.type.toLowerCase()}...`}
        placeholderTextColor="#666"
        value={block.content}
        onChangeText={(text) => onChange(block.id, text)}
      />

      <PresetSelectorModal
        visible={modalVisible}
        blockType={block.type}
        onClose={() => setModalVisible(false)}
        onSelect={handleSelectPreset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.shell,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.node,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.control,
    gap: 4,
  },
  presetBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  removeBtn: {
    padding: 4,
  },
  input: {
    color: theme.colors.text,
    backgroundColor: theme.colors.inputBackground,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 10,
    borderRadius: theme.radii.control,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
