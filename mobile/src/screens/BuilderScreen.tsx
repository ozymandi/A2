import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  Linking,
  Share
} from 'react-native';
import { Settings, Plus, Sparkles, Copy, Camera, Image as ImageIcon, XCircle, ExternalLink, Share2, RotateCcw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PromptBlock from '../components/PromptBlock';
import PaletteBlock from '../components/PaletteBlock';
import { optimizePrompt, decompileImage, PromptBlock as IPromptBlock } from '../services/llmService';
import { theme } from '../constants/theme';

const BLOCK_TYPES = ['Subject', 'Environment', 'Camera', 'Lighting', 'Style', 'Artist', 'Aspect Ratio', 'Custom', 'Palette'];
const TARGET_ENGINES = ["Midjourney", "Stable Diffusion", "DALL-E", "Veo", "Sora", "Ideogram", "Nano banana", "GPT Image", "Flux", "Qwen", "Z _image"];

export default function BuilderScreen({ navigation }: any) {
  const [blocks, setBlocks] = useState<IPromptBlock[]>([
    { id: '1', type: 'Subject', content: '' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDecompiling, setIsDecompiling] = useState(false);
  const [result, setResult] = useState('');
  
  // Output Settings
  const [targetEngine, setTargetEngine] = useState('Midjourney');
  const [outputFormat, setOutputFormat] = useState('Plain Text');

  // Image State
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  const handleReset = () => {
    Alert.alert(
      'Reset Canvas',
      'Are you sure you want to clear all blocks and images?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            setBlocks([{ id: Date.now().toString(), type: 'Subject', content: '' }]);
            setImageUri(null);
            setBase64Image(null);
            setResult('');
          }
        }
      ]
    );
  };

  // Add settings and reset buttons to header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginRight: 15 }}>
          <TouchableOpacity onPress={handleReset}>
            <RotateCcw color="#fff" size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Settings color="#fff" size={24} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  const pickImage = async (useCamera: boolean) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    };

    let result;
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Gallery permission is required to upload photos.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setBase64Image(result.assets[0].base64 || null);
    }
  };

  const handleDecompile = async () => {
    if (!base64Image) return;

    setIsDecompiling(true);
    try {
      const newBlocks = await decompileImage(base64Image);
      setBlocks(newBlocks);
      Alert.alert('Success', 'Image decompiled into blocks!');
    } catch (e: any) {
      Alert.alert('Decompilation Error', e.message);
    } finally {
      setIsDecompiling(false);
    }
  };

  const addBlock = (type: string) => {
    setBlocks([...blocks, { id: Date.now().toString(), type, content: '' }]);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const handleOptimize = async () => {
    const activeBlocks = blocks.filter(b => b.content.trim() !== '' || b.type === 'Palette');
    if (activeBlocks.length === 0 && !base64Image) {
      Alert.alert('Empty', 'Please add some content or an image first.');
      return;
    }

    setIsGenerating(true);
    setResult('');
    
    try {
      const generated = await optimizePrompt(activeBlocks, base64Image || undefined, targetEngine, outputFormat);
      setResult(generated);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    Clipboard.setString(result);
    Alert.alert('Copied!', 'Prompt copied to clipboard.');
  };

  const sharePrompt = async () => {
    if (!result) return;
    try {
      await Share.share({
        message: result,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const openIdeogram = () => {
    Linking.openURL('https://ideogram.ai/');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.imageActionRow}>
          <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage(false)}>
            <ImageIcon color={theme.colors.textMuted} size={20} />
            <Text style={styles.imageBtnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage(true)}>
            <Camera color={theme.colors.textMuted} size={20} />
            <Text style={styles.imageBtnText}>Camera</Text>
          </TouchableOpacity>
        </View>

        {imageUri && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity 
              style={styles.removeImageBtn} 
              onPress={() => { setImageUri(null); setBase64Image(null); }}
            >
              <XCircle color="#EF4444" size={24} fill="#171717" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.decompileBtn} 
              onPress={handleDecompile}
              disabled={isDecompiling}
            >
              {isDecompiling ? <ActivityIndicator color="#fff" size="small" /> : <Sparkles color="#fff" size={16} />}
              <Text style={styles.decompileBtnText}>
                {isDecompiling ? 'Decompiling...' : 'Decompile Image'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {blocks.map(block => 
          block.type === 'Palette' ? (
            <PaletteBlock 
              key={block.id} 
              block={block} 
              allBlocks={blocks}
              onChange={updateBlock} 
              onRemove={removeBlock} 
            />
          ) : (
            <PromptBlock 
              key={block.id} 
              block={block} 
              onChange={updateBlock} 
              onRemove={removeBlock} 
            />
          )
        )}

        <View style={styles.addButtonsContainer}>
          <Text style={styles.addLabel}>ADD BLOCK:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.addScroll}>
            {BLOCK_TYPES.map(type => (
              <TouchableOpacity key={type} style={styles.typeChip} onPress={() => addBlock(type)}>
                <Plus color={theme.colors.textMuted} size={16} />
                <Text style={styles.typeChipText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.settingCol}>
            <Text style={styles.settingLabel}>TARGET ENGINE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.settingScroll}>
              {TARGET_ENGINES.map(eng => (
                <TouchableOpacity 
                  key={eng} 
                  style={[styles.settingChip, targetEngine === eng && styles.settingChipActive]}
                  onPress={() => setTargetEngine(eng)}
                >
                  <Text style={[styles.settingChipText, targetEngine === eng && styles.settingChipTextActive]}>{eng}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.settingCol}>
            <Text style={styles.settingLabel}>OUTPUT FORMAT</Text>
            <View style={styles.formatRow}>
              {['Plain Text', 'JSON'].map(fmt => (
                <TouchableOpacity 
                  key={fmt} 
                  style={[styles.settingChip, outputFormat === fmt && styles.settingChipActive]}
                  onPress={() => setOutputFormat(fmt)}
                >
                  <Text style={[styles.settingChipText, outputFormat === fmt && styles.settingChipTextActive]}>{fmt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.optimizeBtn, isGenerating && styles.optimizeBtnDisabled]} 
          onPress={handleOptimize}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Sparkles color="#fff" size={20} />
              <Text style={styles.optimizeBtnText}>Optimize Prompt</Text>
            </>
          )}
        </TouchableOpacity>

        {result ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>GENERATED PROMPT</Text>
              <View style={styles.resultActions}>
                <TouchableOpacity onPress={sharePrompt} style={styles.copyBtn}>
                  <Share2 color={theme.colors.textMuted} size={18} />
                </TouchableOpacity>
                <TouchableOpacity onPress={copyToClipboard} style={styles.copyBtn}>
                  <Copy color={theme.colors.textMuted} size={18} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.resultText}>{result}</Text>
            
            {targetEngine === 'Ideogram' && (
              <TouchableOpacity style={styles.ideogramBtn} onPress={openIdeogram}>
                <ExternalLink color="#fff" size={16} />
                <Text style={styles.ideogramBtnText}>Open in Ideogram</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  imageActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingVertical: 12,
    borderRadius: theme.radii.shell,
  },
  imageBtnText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    marginBottom: 16,
    borderRadius: theme.radii.shell,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  decompileBtn: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    ...theme.shadows.node,
  },
  decompileBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addButtonsContainer: {
    marginBottom: 24,
  },
  addLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  addScroll: {
    flexDirection: 'row',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  typeChipText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginLeft: 4,
  },
  optimizeBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: theme.radii.shell,
    gap: 8,
    marginTop: 8,
  },
  optimizeBtnDisabled: {
    backgroundColor: theme.colors.inputBackground,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  optimizeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resultCard: {
    marginTop: 24,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.shell,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.node,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
  },
  resultTitle: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  copyBtn: {
    padding: 4,
  },
  resultText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  ideogramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    borderRadius: theme.radii.control,
    marginTop: 16,
    gap: 8,
  },
  ideogramBtnText: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  settingsRow: {
    marginBottom: 20,
  },
  settingCol: {
    flexDirection: 'column',
  },
  settingLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  settingScroll: {
    flexDirection: 'row',
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  settingChip: {
    backgroundColor: theme.colors.inputBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radii.control,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  settingChipActive: {
    backgroundColor: 'rgba(24, 160, 251, 0.1)',
    borderColor: theme.colors.primary,
  },
  settingChipText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  settingChipTextActive: {
    color: theme.colors.primary,
  },
});
