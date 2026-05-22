// Simple Adobe Swatch Exchange (ASE) generator
// Format specs: https://www.selapa.net/swatches/colors/fileformats.php

function strToUtf16be(str: string): Uint8Array {
  const buf = new Uint8Array((str.length + 1) * 2);
  for (let i = 0; i < str.length; i++) {
    buf[i * 2] = 0; // high byte
    buf[i * 2 + 1] = str.charCodeAt(i); // low byte
  }
  buf[str.length * 2] = 0;
  buf[str.length * 2 + 1] = 0; // null terminator
  return buf;
}

export function generateAseFile(colors: string[]): Blob {
  const chunks: Uint8Array[] = [];

  // Signature 'ASEF'
  chunks.push(new Uint8Array([65, 83, 69, 70]));

  // Version 1.0
  chunks.push(new Uint8Array([0, 1, 0, 0]));

  // Block count
  const blockCount = new DataView(new ArrayBuffer(4));
  blockCount.setUint32(0, colors.length, false);
  chunks.push(new Uint8Array(blockCount.buffer));

  // Blocks
  colors.forEach((hex, i) => {
    // Block Type: 1 (Color)
    const blockType = new DataView(new ArrayBuffer(2));
    blockType.setUint16(0, 1, false);
    
    // Parse Hex
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255.0;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255.0;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255.0;

    const nameBuf = strToUtf16be(`Color ${i + 1} (${hex})`);
    
    // Color Model: 'RGB '
    const colorModel = new Uint8Array([82, 71, 66, 32]);
    
    // Color Values (3 * float32)
    const colorValues = new DataView(new ArrayBuffer(12));
    colorValues.setFloat32(0, r, false);
    colorValues.setFloat32(4, g, false);
    colorValues.setFloat32(8, b, false);
    
    // Color Type: 2 (Normal)
    const colorType = new DataView(new ArrayBuffer(2));
    colorType.setUint16(0, 2, false);

    // Block Length
    const blockLength = new DataView(new ArrayBuffer(4));
    const length = 2 + nameBuf.length + 4 + 12 + 2; // name len + name + model + values + type
    blockLength.setUint32(0, length, false);

    // Name length (number of characters including null)
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

  return new Blob([result], { type: 'application/octet-stream' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
