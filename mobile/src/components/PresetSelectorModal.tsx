import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  SectionList,
  FlatList,
  Platform
} from 'react-native';
import { X } from 'lucide-react-native';
import { NODE_PRESETS, PresetItem, PresetGroup } from '../constants/presets';
import { theme } from '../constants/theme';

interface PresetSelectorModalProps {
  visible: boolean;
  blockType: string;
  onClose: () => void;
  onSelect: (preset: string) => void;
}

export default function PresetSelectorModal({ visible, blockType, onClose, onSelect }: PresetSelectorModalProps) {
  const presets = NODE_PRESETS[blockType] || [];

  if (!visible) return null;

  // Determine if presets are grouped or flat
  const isGrouped = presets.length > 0 && typeof presets[0] === 'object';

  const renderGroupedItem = ({ item }: { item: string }) => (
    <TouchableOpacity style={styles.presetItem} onPress={() => onSelect(item)}>
      <Text style={styles.presetText}>{item}</Text>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title } }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderFlatItem = ({ item }: { item: PresetItem }) => {
    if (typeof item === 'string') {
      return (
        <TouchableOpacity style={styles.presetItem} onPress={() => onSelect(item)}>
          <Text style={styles.presetText}>{item}</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const sections = isGrouped 
    ? (presets as PresetGroup[]).map(group => ({
        title: group.groupName,
        data: group.items
      }))
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{blockType} Presets</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#A3A3A3" size={24} />
            </TouchableOpacity>
          </View>

          {presets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No presets available for this block type.</Text>
            </View>
          ) : isGrouped ? (
            <SectionList
              sections={sections}
              keyExtractor={(item, index) => item + index}
              renderItem={renderGroupedItem}
              renderSectionHeader={renderSectionHeader}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
            />
          ) : (
            <FlatList
              data={presets}
              keyExtractor={(item, index) => (item as string) + index}
              renderItem={renderFlatItem}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeaderText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  presetItem: {
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radii.shell,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  presetText: {
    color: theme.colors.text,
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 15,
  }
});
