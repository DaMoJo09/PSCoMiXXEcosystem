const maxColors = 256;

const buildPalette = (pixels: Uint8ClampedArray, width: number, height: number): number[][] => {
  const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();
  const step = Math.max(1, Math.floor(pixels.length / 4 / 10000));
  for (let i = 0; i < pixels.length; i += 4 * step) {
    const r = pixels[i] & 0xF8;
    const g = pixels[i + 1] & 0xF8;
    const b = pixels[i + 2] & 0xF8;
    const key = `${r},${g},${b}`;
    const existing = colorMap.get(key);
    if (existing) existing.count++;
    else colorMap.set(key, { r, g, b, count: 1 });
  }
  const sorted = Array.from(colorMap.values()).sort((a, b) => b.count - a.count);
  const palette: number[][] = [];
  for (let i = 0; i < Math.min(maxColors, sorted.length); i++) {
    palette.push([sorted[i].r, sorted[i].g, sorted[i].b]);
  }
  while (palette.length < maxColors) palette.push([0, 0, 0]);
  return palette;
};

const findClosest = (palette: number[][], r: number, g: number, b: number): number => {
  let minDist = Infinity;
  let idx = 0;
  for (let i = 0; i < palette.length; i++) {
    const dr = r - palette[i][0];
    const dg = g - palette[i][1];
    const db = b - palette[i][2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) { minDist = dist; idx = i; }
  }
  return idx;
};

const indexFrame = (pixels: Uint8ClampedArray, palette: number[][], width: number, height: number): Uint8Array => {
  const count = width * height;
  const indexed = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const off = i * 4;
    indexed[i] = findClosest(palette, pixels[off], pixels[off + 1], pixels[off + 2]);
  }
  return indexed;
};

const lzwEncode = (indexed: Uint8Array, colorBits: number): Uint8Array => {
  const minCodeSize = Math.max(2, colorBits);
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const maxCode = 4096;

  const output: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;

  const writeBits = (code: number, size: number) => {
    bitBuffer |= code << bitCount;
    bitCount += size;
    while (bitCount >= 8) {
      output.push(bitBuffer & 0xFF);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  const table = new Map<string, number>();
  const initTable = () => {
    table.clear();
    for (let i = 0; i < clearCode; i++) table.set(String(i), i);
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  };

  initTable();
  writeBits(clearCode, codeSize);

  let current = String(indexed[0]);
  for (let i = 1; i < indexed.length; i++) {
    const next = current + ',' + indexed[i];
    if (table.has(next)) {
      current = next;
    } else {
      writeBits(table.get(current)!, codeSize);
      if (nextCode < maxCode) {
        table.set(next, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        writeBits(clearCode, codeSize);
        initTable();
      }
      current = String(indexed[i]);
    }
  }
  writeBits(table.get(current)!, codeSize);
  writeBits(eoiCode, codeSize);
  if (bitCount > 0) output.push(bitBuffer & 0xFF);

  const result: number[] = [minCodeSize];
  for (let pos = 0; pos < output.length;) {
    const chunkSize = Math.min(255, output.length - pos);
    result.push(chunkSize);
    for (let j = 0; j < chunkSize; j++) result.push(output[pos + j]);
    pos += chunkSize;
  }
  result.push(0);
  return new Uint8Array(result);
};

function encodeGIF(
  frameDataArrays: Uint8ClampedArray[],
  width: number,
  height: number,
  delayMs: number,
  postProgress: (progress: number) => void
): Uint8Array {
  const delayCentiseconds = Math.max(2, Math.round(delayMs / 10));

  const palette = buildPalette(frameDataArrays[0], width, height);
  const colorBits = 8;

  const allBytes: number[] = [];
  const writeByte = (b: number) => allBytes.push(b & 0xFF);
  const writeShort = (s: number) => { writeByte(s & 0xFF); writeByte((s >> 8) & 0xFF); };
  const writeBytes = (arr: Uint8Array | number[]) => { for (let i = 0; i < arr.length; i++) allBytes.push(arr[i]); };

  writeByte(0x47); writeByte(0x49); writeByte(0x46);
  writeByte(0x38); writeByte(0x39); writeByte(0x61);

  writeShort(width);
  writeShort(height);
  writeByte(0x87);
  writeByte(0);
  writeByte(0);

  for (let i = 0; i < 256; i++) {
    writeByte(palette[i][0]); writeByte(palette[i][1]); writeByte(palette[i][2]);
  }

  writeByte(0x21); writeByte(0xFF); writeByte(11);
  const netscape = [0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30];
  writeBytes(netscape);
  writeByte(3); writeByte(1); writeShort(0); writeByte(0);

  for (let f = 0; f < frameDataArrays.length; f++) {
    postProgress(f / frameDataArrays.length);

    writeByte(0x21); writeByte(0xF9); writeByte(4);
    writeByte(0x00);
    writeShort(delayCentiseconds);
    writeByte(0); writeByte(0);

    writeByte(0x2C);
    writeShort(0); writeShort(0);
    writeShort(width); writeShort(height);
    writeByte(0);

    const indexed = indexFrame(frameDataArrays[f], palette, width, height);
    const lzwData = lzwEncode(indexed, colorBits);
    writeBytes(lzwData);
  }

  writeByte(0x3B);
  postProgress(1);
  return new Uint8Array(allBytes);
}

self.onmessage = (e: MessageEvent) => {
  const { frameDataArrays, width, height, delayMs } = e.data as {
    frameDataArrays: Uint8ClampedArray[];
    width: number;
    height: number;
    delayMs: number;
  };

  const gifBytes = encodeGIF(frameDataArrays, width, height, delayMs, (progress: number) => {
    self.postMessage({ type: 'progress', progress });
  });

  self.postMessage({ type: 'done', gifBytes }, [gifBytes.buffer] as any);
};
