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

function createPosterCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器暂时无法生成海报。');
  ctx.fillStyle = '#f8f5ed';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textBaseline = 'middle';
  return { canvas, ctx };
}

async function drawPosterHeader(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#24282c';
  ctx.font = '900 29px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('BJEA  /  ALUMNI', 72, 82);
  ctx.fillStyle = '#686d70';
  ctx.font = '600 21px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('毕业之后的故事', 72, 122);
  ctx.fillStyle = '#d9d6ce';
  ctx.fillRect(72, 160, 936, 2);
  try {
    const logo = await loadImage('/school-logo.svg');
    const logoHeight = 96 * logo.naturalHeight / logo.naturalWidth;
    ctx.drawImage(logo, 912, 94 - logoHeight / 2, 96, logoHeight);
  } catch { /* The poster can still be saved without the logo. */ }
}

async function drawQrCard(ctx: CanvasRenderingContext2D, url: string, title: string) {
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 210,
    color: { dark: '#24282c', light: '#ffffff' },
  });
  const qr = await loadImage(qrDataUrl);
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 72, 1182, 936, 248, 28);
  ctx.drawImage(qr, 92, 1201, 210, 210);
  ctx.fillStyle = '#24282c';
  ctx.font = '900 40px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(title, 346, 1248);
  ctx.fillStyle = '#686d70';
  ctx.font = '600 27px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('亦中校友宇宙', 346, 1300);
  ctx.font = '500 23px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(new URL(url).host, 346, 1350, 620);
}

function posterBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('海报保存失败，请重试。')), 'image/png');
  });
}

export async function renderSharePoster(profile: AlumniProfile, profileUrl: string): Promise<Blob> {
  const { canvas, ctx } = createPosterCanvas();

  const ink = '#24282c';
  const muted = '#686d70';
  await drawPosterHeader(ctx);

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

  if (profile.avatarImageUrl?.startsWith('/api/avatar/generated/')) {
    try {
      const avatar = await loadImage(profile.avatarImageUrl);
      const size = 450;
      ctx.drawImage(avatar, (WIDTH - size) / 2, 275 + (500 - size) / 2, size, size);
    } catch {
      ctx.textAlign = 'center';
      ctx.font = '340px serif';
      ctx.fillText('✦', WIDTH / 2, 505);
      ctx.textAlign = 'left';
    }
  } else {
    ctx.textAlign = 'center';
    ctx.font = '340px serif';
    ctx.fillText('✦', WIDTH / 2, 505);
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
  await drawQrCard(ctx, profileUrl, '扫码查看 Profile');
  return posterBlob(canvas);
}

export async function renderAlumniWallPoster(siteUrl: string): Promise<Blob> {
  const { canvas, ctx } = createPosterCanvas();
  await drawPosterHeader(ctx);

  ctx.fillStyle = '#24282c';
  ctx.font = '900 91px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('毕业以后，', 72, 286);
  ctx.font = '900 76px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('大家都去哪儿了？', 72, 397);
  ctx.fillStyle = '#62686b';
  ctx.font = '600 32px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('没有标准答案，来看看不同的选择与人生支线。', 72, 507, 936);

  const gradient = ctx.createLinearGradient(72, 630, 1008, 1092);
  gradient.addColorStop(0, '#f28359');
  gradient.addColorStop(0.55, '#f6a64f');
  gradient.addColorStop(1, '#f7d475');
  ctx.fillStyle = gradient;
  roundRect(ctx, 72, 596, 936, 512, 32);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(72, 596, 936, 512, 32);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.arc(90, 1090, 210, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1030, 600, 230, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.setLineDash([17, 22]);
  ctx.beginPath();
  ctx.moveTo(190, 960);
  ctx.bezierCurveTo(285, 750, 470, 1035, 570, 805);
  ctx.bezierCurveTo(690, 600, 800, 875, 913, 712);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const [x, y, color] of [[190, 960, '#24282c'], [570, 805, '#1678b8'], [913, 712, '#4e9b62']] as const) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#24282c';
  ctx.font = '900 29px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('每个人，一条不一样的路。', 118, 668);
  ctx.restore();

  ctx.fillStyle = '#d9d6ce';
  ctx.fillRect(72, 1146, 936, 2);
  await drawQrCard(ctx, siteUrl, '扫码逛校友墙');
  return posterBlob(canvas);
}
