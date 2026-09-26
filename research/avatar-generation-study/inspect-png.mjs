import { readFile, readdir, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./', import.meta.url));
const results = [];
for (const file of (await readdir(root)).filter(f => /^\d.*\.png$/.test(f))) {
  const b = await readFile(root + file), width = b.readUInt32BE(16), height = b.readUInt32BE(20);
  if (b[24] !== 8 || b[25] !== 6 || b[28] !== 0) throw new Error('Only noninterlaced 8-bit RGBA PNG is supported.');
  const chunks = [];
  for (let offset = 8; offset < b.length;) {
    const n = b.readUInt32BE(offset), type = b.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(b.subarray(offset + 8, offset + 8 + n));
    offset += n + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4;
  let prev = Buffer.alloc(stride), cursor = 0, transparent = 0, partial = 0, opaque = 0, substantial = 0, outside = 0;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  const histogram = Array(256).fill(0);
  const paeth = (a, c, d) => { const p = a + c - d, pa = Math.abs(p-a), pc = Math.abs(p-c), pd = Math.abs(p-d); return pa <= pc && pa <= pd ? a : pc <= pd ? c : d; };
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor++], row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? row[x-4] : 0, c = prev[x], d = x >= 4 ? prev[x-4] : 0;
      const predictor = [0, a, c, Math.floor((a+c)/2), paeth(a,c,d)][filter];
      if (predictor === undefined) throw new Error('Invalid PNG filter.');
      row[x] = (raw[cursor++] + predictor) & 255;
    }
    for (let x = 0; x < width; x++) {
      const alpha = row[x*4+3]; histogram[alpha]++;
      if (alpha === 0) transparent++; else if (alpha === 255) opaque++; else partial++;
      if (alpha >= 128) {
        substantial++; minX = Math.min(minX,x); maxX = Math.max(maxX,x); minY = Math.min(minY,y); maxY = Math.max(maxY,y);
        if (((x+0.5-width/2)/(width/2))**2 + ((y+0.5-height/2)/(height/2))**2 > 1) outside++;
      }
    }
    prev = row;
  }
  results.push({ file, width, height, bytes: b.length, transparent_fraction: transparent/(width*height), partial_alpha_fraction: partial/(width*height), opaque_fraction: opaque/(width*height), alpha128_bounds: [minX,minY,maxX,maxY], alpha128_margin_fraction: {left:minX/width,top:minY/height,right:(width-1-maxX)/width,bottom:(height-1-maxY)/height}, circle_clipped_alpha128_pixels: outside, circle_clipped_alpha128_fraction: substantial ? outside/substantial : null, alpha_histogram: histogram });
}
await writeFile(root + 'image-metrics.json', JSON.stringify(results,null,2) + '\n');
console.log(JSON.stringify(results.map(({alpha_histogram,...rest})=>rest),null,2));
