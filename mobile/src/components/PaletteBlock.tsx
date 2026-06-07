import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Clipboard } from 'react-native';
import { Palette, RefreshCw, Copy, Download, Trash2 } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PromptBlock as IPromptBlock, generatePalette } from '../services/llmService';
import { theme } from '../constants/theme';

interface Props {
  block: IPromptBlock;
  allBlocks: IPromptBlock[];
  onChange: (id: string, newContent: string) => void;
  onRemove: (id: string) => void;
}

// Helper to convert Uint8Array to Base64
function uint8ToBase64(u8Arr: Uint8Array) {
  let binary = '';
  const len = u8Arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(u8Arr[i]);
  }
  return btoa(binary);
}

function strToUtf16be(str: string): Uint8Array {
  const buf = new Uint8Array((str.length + 1) * 2);
  for (let i = 0; i < str.length; i++) {
    buf[i * 2] = 0;
    buf[i * 2 + 1] = str.charCodeAt(i);
  }
  buf[str.length * 2] = 0;
  buf[str.length * 2 + 1] = 0;
  return buf;
}

function generateAseBase64(colors: string[]): string {
  const chunks: Uint8Array[] = [];

  chunks.push(new Uint8Array([65, 83, 69, 70])); // ASEF
  chunks.push(new Uint8Array([0, 1, 0, 0])); // Version 1.0

  const blockCount = new DataView(new ArrayBuffer(4));
  blockCount.setUint32(0, colors.length, false);
  chunks.push(new Uint8Array(blockCount.buffer));

  colors.forEach((hex, i) => {
    const blockType = new DataView(new ArrayBuffer(2));
    blockType.setUint16(0, 1, false);
    
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255.0;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255.0;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255.0;

    const nameBuf = strToUtf16be(`Color ${i + 1} (${hex})`);
    const colorModel = new Uint8Array([82, 71, 66, 32]);
    
    const colorValues = new DataView(new ArrayBuffer(12));
    colorValues.setFloat32(0, r, false);
    colorValues.setFloat32(4, g, false);
    colorValues.setFloat32(8, b, false);
    
    const colorType = new DataView(new ArrayBuffer(2));
    colorType.setUint16(0, 2, false);

    const blockLength = new DataView(new ArrayBuffer(4));
    const length = 2 + nameBuf.length + 4 + 12 + 2; 
    blockLength.setUint32(0, length, false);

    const nameLen = new DataView(new ArrayBuffer(2));
    nameLen.setUint16(0, nameBuf.length / 2, false);

    chunks.push(new Uint8Array(blockType.buffer));
    chunks.push(new Uint8Array(blockLength.buffer));
    chunks.push(new Uint8Array(nameLen.buffer));
    chunks.push(nameBuf);
    chunks.push(colorModel);
    chunks.push(new Uint8Array(colorValues.buffer));
    chunks.push(new Uint8Array(colorType.buffer));
  });

  let totalLength = 0;
  for (const chunk of chunks) totalLength += chunk.length;
  
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return uint8ToBase64(result);
}

export default function PaletteBlock({ block, allBlocks, onChange, onRemove }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Parse colors from block.content or default to empty
  let colors: string[] = [];
  try {
    if (block.content) colors = JSON.parse(block.content);
  } catch (e) {}

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generatedColors = await generatePalette(allBlocks);
      onChange(block.id, JSON.stringify(generatedColors));
    } catch (e: any) {
      Alert.alert('Error generating palette', e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyHex = (hex: string) => {
    Clipboard.setString(hex);
    Alert.alert('Copied', `Hex code ${hex} copied to clipboard.`);
  };

  const copyJson = () => {
    if (colors.length === 0) return;
    Clipboard.setString(JSON.stringify(colors, null, 2));
    Alert.alert('Copied', 'Palette JSON copied to clipboard!');
  };

  const exportAse = async () => {
    if (colors.length === 0) return;
    try {
      const base64 = generateAseBase64(colors);
      const fileUri = `${FileSystem.cacheDirectory}palette.ase`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/octet-stream',
          dialogTitle: 'Export ASE Palette',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Palette color={theme.colors.textMuted} size={16} />
          <Text style={styles.typeText}>COLOR PALETTE</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleGenerate} disabled={isGenerating} style={styles.generateBtn}>
            {isGenerating ? <ActivityIndicator size="small" color="#fff" /> : <RefreshCw color={theme.colors.textMuted} size={14} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemove(block.id)} style={styles.removeBtn}>
            <Trash2 color={theme.colors.textMuted} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.colorsContainer}>
        {colors.length > 0 ? (
          <View style={styles.colorRow}>
            {colors.map((hex, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.colorBlock, { backgroundColor: hex }]}
                onPress={() => copyHex(hex)}
                activeOpacity={0.7}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Tap generate to extract palette</Text>
        )}
      </View>

      <View style={styles.exportRow}>
        <TouchableOpacity 
          style={[styles.exportBtn, colors.length === 0 && styles.exportBtnDisabled]} 
          onPress={copyJson}
          disabled={colors.length === 0}
        >
          <Copy color={colors.length === 0 ? "#666" : "#E2E8F0"} size={14} />
          <Text style={[styles.exportBtnText, colors.length === 0 && styles.exportBtnTextDisabled]}>JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.exportBtnPrimary, colors.length === 0 && styles.exportBtnPrimaryDisabled]} 
          onPress={exportAse}
          disabled={colors.length === 0}
        >
          <Download color={theme.colors.textMuted} size={14} />
          <Text style={[styles.exportBtnPrimaryText, colors.length === 0 && styles.exportBtnPrimaryTextDisabled]}>.ASE</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  generateBtn: {
    padding: 6,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  removeBtn: {
    padding: 4,
  },
  colorsContainer: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.radii.shell,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    padding: 12,
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    height: 48,
    borderRadius: theme.radii.surface,
    overflow: 'hidden',
  },
  colorBlock: {
    flex: 1,
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 12,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 8,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: 10,
    borderRadius: theme.radii.shell,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  exportBtnDisabled: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
  },
  exportBtnText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  exportBtnTextDisabled: {
    color: theme.colors.textMuted,
  },
  exportBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24, 160, 251, 0.1)',
    paddingVertical: 10,
    borderRadius: theme.radii.shell,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  exportBtnPrimaryDisabled: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.border,
  },
  exportBtnPrimaryText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  exportBtnPrimaryTextDisabled: {
    color: theme.colors.textMuted,
  },
});
