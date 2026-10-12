import QRCode from 'qrcode';
import type { AlumniProfile, Tone } from '@/lib/alumni-data';

const WIDTH = 1080;
const HEIGHT = 1500;
const toneColors: Record<Tone, [string, string, string]> = {
  sunset: ['#ff7048', '#f59b24', '#ffd45a'],
  ocean: ['#1678b8', '#58a9d8', '#bde4ee'],
  lemon: ['#f6ac23', '#ffcf4f', '#fff0a2'],
  mint: ['#3e9f67', '#73bd6b', '#c8e8a9'],
  berry: ['#e34a35', '#ef735c', '#f8c5b5'],
  graphite: ['#48515a', '#78828a', '#cbd0d3'],
  coral: ['#ef593c', '#f18c58', '#ffd09e'],
  sky: ['#1c83c5', '#71b5db', '#d1ebf5'],
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function drawFittedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, initialSize: number, minSize: number) {
  let size = initialSize;
  while (size > minSize) {
    ctx.font = `900 ${size}px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.fillText(text, x, y, maxWidth);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const chars = Array.from(text);
  const lines: string[] = [];
  let line = '';
  for (const char of chars) {
    if (ctx.measureText(line + char).width > maxWidth && line) {
      lines.push(line);
      line = char;
      if (lines.length === maxLines) break;
    } else line += char;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.join('').length < chars.length && lines.length) {
    const last = lines.length - 1;
    while (ctx.measureText(`${lines[last]}…`).width > maxWidth) lines[last] = lines[last].slice(0, -1);
    lines[last] += '…';
  }
  return lines;
}

export async function renderSharePoster(profile: AlumniProfile, profileUrl: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器暂时无法生成海报。');

  const ink = '#24282c';
  const muted = '#686d70';
  const paper = '#f8f5ed';
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;
  ctx.font = '900 29px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('BJEA  /  ALUMNI', 72, 82);
  ctx.fillStyle = muted;
  ctx.font = '600 21px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('毕业之后的故事', 72, 122);
  ctx.fillStyle = '#d9d6ce';
  ctx.fillRect(72, 160, 936, 2);

  try {
    const logo = await loadImage('/school-logo.png');
    ctx.drawImage(logo, 912, 55, 96, 78);
  } catch { /* The poster can still be saved without the logo. */ }

  const gradient = ctx.createLinearGradient(72, 200, 1008, 748);
  const colors = toneColors[profile.tone];
  gradient.addColorStop(0, colors[2]);
  gradient.addColorStop(1, colors[1]);
  ctx.fillStyle = gradient;
  roundRect(ctx, 72, 198, 936, 542, 32);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(72, 198, 936, 542, 32);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.arc(123, 710, 230, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1000, 240, 200, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  roundRect(ctx, 102, 226, 262, 58, 29);
  ctx.fillStyle = ink;
  ctx.font = '900 27px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(`CLASS OF '${profile.year.slice(-2)}`, 128, 255);

  if (profile.avatarImageUrl?.startsWith('/api/avatar/')) {
    try {
      const avatar = await loadImage(profile.avatarImageUrl);
      const generated = profile.avatarImageUrl.startsWith('/api/avatar/generated/');
      const size = generated ? 450 : 500;
      ctx.drawImage(avatar, (WIDTH - size) / 2, 275 + (500 - size) / 2, size, size);
    } catch {
      ctx.textAlign = 'center';
      ctx.font = '340px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.fillText(profile.emoji || '✦', WIDTH / 2, 505);
      ctx.textAlign = 'left';
    }
  } else {
    ctx.textAlign = 'center';
    ctx.font = '340px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.fillText(profile.emoji || '✦', WIDTH / 2, 505);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  ctx.fillStyle = ink;
  drawFittedText(ctx, profile.nickname, 72, 842, 936, 82, 42);

  ctx.font = '600 37px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#3f4548';
  const summary = `“${profile.summary}”`;
  wrapText(ctx, summary, 930, 3).forEach((line, index) => ctx.fillText(line, 72, 944 + index * 54));

  ctx.fillStyle = muted;
  ctx.font = '600 27px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(profile.field, 72, 1085, 930);

  ctx.fillStyle = '#d9d6ce';
  ctx.fillRect(72, 1146, 936, 2);
  const qrDataUrl = await QRCode.toDataURL(profileUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 210,
    color: { dark: ink, light: '#ffffff' },
  });
  const qr = await loadImage(qrDataUrl);
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 72, 1182, 936, 248, 28);
  ctx.drawImage(qr, 92, 1201, 210, 210);

  ctx.fillStyle = ink;
  ctx.font = '900 40px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('扫码查看 Profile', 346, 1248);
  ctx.fillStyle = muted;
  ctx.font = '600 27px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('亦中校友宇宙', 346, 1300);
  ctx.font = '500 23px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  const host = new URL(profileUrl).host;
  ctx.fillText(host, 346, 1350, 620);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('海报保存失败，请重试。')), 'image/png');
  });
}
