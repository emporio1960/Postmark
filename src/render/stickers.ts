// Vector stickers drawn inside a 100 × 100 box so they scale cleanly.
type Ctx = CanvasRenderingContext2D;
type Draw = (ctx: Ctx, color: string) => void;

const path = (ctx: Ctx, d: string, color: string) => { ctx.fillStyle = color; ctx.fill(new Path2D(d)); };
const soft = 'rgba(255,255,255,.55)';

export const STICKERS: Record<string, { label: string; draw: Draw }> = {
  heart: { label: 'Heart', draw: (c, col) => path(c, 'M50 90C20 68 6 50 6 31 6 17 17 8 29 8c9 0 17 5 21 14C54 13 62 8 71 8c12 0 23 9 23 23 0 19-14 37-44 59z', col) },
  star: { label: 'Star', draw: (c, col) => path(c, 'M50 5l13.2 28.6 31.3 3.9-23 21.5 6 31L50 74.6 22.5 90l6-31-23-21.5 31.3-3.9z', col) },
  sparkle: { label: 'Sparkle', draw: (c, col) => path(c, 'M50 4Q54 46 96 50 54 54 50 96 46 54 4 50 46 46 50 4z', col) },
  flower: {
    label: 'Flower', draw: (c, col) => {
      c.save(); c.translate(50, 50); c.fillStyle = col;
      for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.ellipse(0, -27, 13, 21, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = soft; c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill(); c.restore();
    },
  },
  leaf: {
    label: 'Leaf', draw: (c, col) => {
      path(c, 'M10 90Q8 28 90 10 92 74 10 90z', col);
      c.strokeStyle = soft; c.lineWidth = 3; c.beginPath(); c.moveTo(16, 84); c.quadraticCurveTo(46, 50, 82, 18); c.stroke();
    },
  },
  moon: { label: 'Moon', draw: (c, col) => path(c, 'M66 10A42 42 0 1 0 90 66 34 34 0 1 1 66 10z', col) },
  sun: {
    label: 'Sun', draw: (c, col) => {
      c.save(); c.translate(50, 50); c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(0, -31); c.lineTo(0, -43); c.stroke(); }
      c.restore();
    },
  },
  balloon: {
    label: 'Balloon', draw: (c, col) => {
      c.strokeStyle = 'rgba(90,80,70,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(50, 70); c.bezierCurveTo(58, 80, 42, 88, 50, 98); c.stroke();
      c.fillStyle = col; c.beginPath(); c.ellipse(50, 36, 27, 33, 0, 0, Math.PI * 2); c.fill();
      path(c, 'M50 66l-6 9h12z', col);
      c.fillStyle = soft; c.beginPath(); c.ellipse(40, 24, 5, 9, -0.5, 0, Math.PI * 2); c.fill();
    },
  },
  gift: {
    label: 'Gift', draw: (c, col) => {
      c.fillStyle = col; c.fillRect(14, 46, 72, 46); c.fillRect(8, 30, 84, 18);
      c.fillStyle = soft; c.fillRect(44, 30, 12, 62);
      c.strokeStyle = col; c.lineWidth = 6;
      c.beginPath(); c.ellipse(37, 20, 12, 9, -0.4, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(63, 20, 12, 9, 0.4, 0, Math.PI * 2); c.stroke();
    },
  },
  cake: {
    label: 'Cake', draw: (c, col) => {
      c.fillStyle = col; c.beginPath(); c.roundRect(12, 52, 76, 38, 6); c.fill();
      path(c, 'M12 58q9.5 14 19 0 9.5 14 19 0 9.5 14 19 0 9.5 14 19 0v-6H12z', soft);
      c.fillStyle = col; c.fillRect(47, 28, 6, 26);
      c.fillStyle = '#E8B04A'; c.beginPath(); c.ellipse(50, 19, 5, 8, 0, 0, Math.PI * 2); c.fill();
    },
  },
  snowflake: {
    label: 'Snowflake', draw: (c, col) => {
      c.save(); c.translate(50, 50); c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -44);
        c.moveTo(0, -26); c.lineTo(10, -36); c.moveTo(0, -26); c.lineTo(-10, -36); c.stroke();
      }
      c.restore();
    },
  },
  tree: {
    label: 'Tree', draw: (c, col) => {
      c.fillStyle = '#8A6A4A'; c.fillRect(44, 80, 12, 16);
      path(c, 'M50 4l20 28H58l18 24H62l20 26H18l20-26H24l18-24H30z', col);
    },
  },
  ring: {
    label: 'Ring', draw: (c, col) => {
      c.strokeStyle = col; c.lineWidth = 8; c.beginPath(); c.arc(50, 62, 27, 0, Math.PI * 2); c.stroke();
      path(c, 'M50 34L36 20l6-10h16l6 10z', col);
      path(c, 'M42 10l8 10 8-10z', soft);
    },
  },
  bow: {
    label: 'Bow', draw: (c, col) => {
      path(c, 'M50 46L10 22q-6 28 0 56zM50 46l40-24q6 28 0 56z', col);
      path(c, 'M46 58L34 94l12-8 8 8 2-36z', col);
      c.fillStyle = col; c.beginPath(); c.arc(50, 50, 10, 0, Math.PI * 2); c.fill();
      c.fillStyle = soft; c.beginPath(); c.arc(50, 50, 5, 0, Math.PI * 2); c.fill();
    },
  },
  crown: { label: 'Crown', draw: (c, col) => { path(c, 'M10 82V32l22 22 18-34 18 34 22-22v50z', col); c.fillStyle = soft; c.fillRect(10, 70, 80, 5); } },
  cloud: { label: 'Cloud', draw: (c, col) => path(c, 'M26 78a20 20 0 0 1-2-40 26 26 0 0 1 50-6 23 23 0 0 1 2 46z', col) },
  butterfly: {
    label: 'Butterfly', draw: (c, col) => {
      c.fillStyle = col;
      ([[30, 34, 22, 26, -0.5], [70, 34, 22, 26, 0.5], [34, 68, 15, 19, 0.4], [66, 68, 15, 19, -0.4]] as number[][]).forEach(([x, y, rx, ry, r]) => {
        c.beginPath(); c.ellipse(x, y, rx, ry, r, 0, Math.PI * 2); c.fill();
      });
      c.fillStyle = 'rgba(60,50,45,.8)'; c.beginPath(); c.ellipse(50, 50, 4, 28, 0, 0, Math.PI * 2); c.fill();
    },
  },
  diamond: { label: 'Gem', draw: (c, col) => { path(c, 'M26 12h48l20 26-44 54L6 38z', col); path(c, 'M26 12l10 26h28l10-26zM36 38l14 54 14-54z', 'rgba(255,255,255,.3)'); } },
  banner: { label: 'Banner', draw: (c, col) => path(c, 'M4 32h92L84 50l12 18H4l12-18z', col) },
  circle: { label: 'Dot', draw: (c, col) => { c.fillStyle = col; c.beginPath(); c.arc(50, 50, 44, 0, Math.PI * 2); c.fill(); } },
  halo: { label: 'Ring line', draw: (c, col) => { c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(50, 50, 46, 0, Math.PI * 2); c.stroke(); } },
  rule: { label: 'Divider', draw: (c, col) => { c.fillStyle = col; c.fillRect(4, 48.5, 36, 3); c.fillRect(60, 48.5, 36, 3); path(c, 'M50 40l10 10-10 10-10-10z', col); } },
};

export const STICKER_IDS = Object.keys(STICKERS);

export const EMOJI_STICKERS = [
  '🎂', '🎉', '🎈', '🎁', '🥂', '🍾', '💐', '🌸', '🌷', '🌹', '🌻', '🌿', '🍀', '💍', '💕', '❤️',
  '💌', '✨', '⭐', '🌙', '☀️', '🌈', '🎄', '⛄', '🕊️', '🕯️', '🎓', '🏆', '👑', '🎀', '👶', '🧸',
  '🐣', '🐰', '🦋', '🐝', '🍰', '☕', '🏖️', '🎶',
];

export function drawSticker(ctx: Ctx, kind: string, color: string, x: number, y: number, w: number, h: number) {
  ctx.save();
  if (kind.startsWith('emoji:')) {
    const size = Math.min(w, h) * 0.86;
    ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(kind.slice(6), x + w / 2, y + h / 2 + size * 0.04);
  } else {
    ctx.translate(x, y); ctx.scale(w / 100, h / 100);
    (STICKERS[kind] ?? STICKERS.heart).draw(ctx, color);
  }
  ctx.restore();
}
