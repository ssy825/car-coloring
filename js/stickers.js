// 자동차 커스텀 데칼 및 스티커 모듈

export const STICKERS = [
  { id: 'num_01', name: 'No. 01', type: 'text', label: '01', color: '#ff2d55', bg: '#ffffff' },
  { id: 'num_07', name: 'No. 07', type: 'text', label: '07', color: '#0a84ff', bg: '#ffffff' },
  { id: 'num_77', name: 'No. 77', type: 'text', label: '77', color: '#ffd60a', bg: '#1c1c1e' },
  { id: 'flame', name: '파이어 불꽃', type: 'flame', color: '#ff3b30' },
  { id: 'lightning', name: '썬더 번개', type: 'lightning', color: '#ffd60a' },
  { id: 'star', name: '레이싱 스타', type: 'star', color: '#ffe600' },
  { id: 'turbo', name: 'TURBO', type: 'text', label: 'TURBO', color: '#00f0ff', bg: '#000000' },
  { id: 'flag', name: '체커기', type: 'flag', color: '#ffffff' },
  { id: 'tire_mark', name: '스키드 마크', type: 'tire', color: '#222222' }
];

export class StickerManager {
  constructor() {
    this.selectedSticker = null;
    this.stickersOnCanvas = [];
    this.activeSticker = null; // 드래그/리사이즈 중인 스티커
  }

  drawSticker(ctx, sticker, x, y, size = 60, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rotation * Math.PI) / 180);

    const half = size / 2;

    switch (sticker.type) {
      case 'text': {
        // 원형 또는 사각 배경
        ctx.fillStyle = sticker.bg || '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, half, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 텍스트
        ctx.fillStyle = sticker.color;
        ctx.font = `bold ${Math.floor(size * 0.48)}px 'Outfit', 'Montserrat', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker.label, 0, 0);
        break;
      }

      case 'flame': {
        ctx.fillStyle = sticker.color || '#ff3b30';
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.bezierCurveTo(half * 0.8, -half * 0.2, half * 0.9, half * 0.8, 0, half);
        ctx.bezierCurveTo(-half * 0.2, half * 0.3, -half * 0.3, half * 0.1, -half * 0.1, -half * 0.2);
        ctx.bezierCurveTo(-half * 0.6, -half * 0.1, -half * 0.8, half * 0.4, -half * 0.6, half * 0.7);
        ctx.bezierCurveTo(-half * 1.1, half * 0.2, -half * 0.8, -half * 0.5, 0, -half);
        ctx.closePath();
        ctx.fill();

        // 안쪽 노란 불꽃
        ctx.fillStyle = '#ffd60a';
        ctx.beginPath();
        ctx.moveTo(0, -half * 0.3);
        ctx.bezierCurveTo(half * 0.4, 0, half * 0.4, half * 0.6, 0, half * 0.8);
        ctx.bezierCurveTo(-half * 0.4, half * 0.6, -half * 0.4, 0, 0, -half * 0.3);
        ctx.fill();
        break;
      }

      case 'lightning': {
        ctx.fillStyle = sticker.color || '#ffd60a';
        ctx.strokeStyle = '#e6b800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(half * 0.1, -half);
        ctx.lineTo(-half * 0.6, 0);
        ctx.lineTo(-half * 0.05, 0);
        ctx.lineTo(-half * 0.2, half);
        ctx.lineTo(half * 0.7, -half * 0.1);
        ctx.lineTo(half * 0.15, -half * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'star': {
        ctx.fillStyle = sticker.color || '#ffe600';
        ctx.strokeStyle = '#ccaa00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const spikes = 5;
        const outerRadius = half;
        const innerRadius = half * 0.45;
        let rot = (Math.PI / 2) * 3;
        let step = Math.PI / spikes;

        ctx.moveTo(0, -outerRadius);
        for (let i = 0; i < spikes; i++) {
          let cx = Math.cos(rot) * outerRadius;
          let cy = Math.sin(rot) * outerRadius;
          ctx.lineTo(cx, cy);
          rot += step;

          cx = Math.cos(rot) * innerRadius;
          cy = Math.sin(rot) * innerRadius;
          ctx.lineTo(cx, cy);
          rot += step;
        }
        ctx.lineTo(0, -outerRadius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'flag': {
        const rows = 4;
        const cols = 6;
        const w = size / cols;
        const h = (size * 0.65) / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#1c1c1e';
            ctx.fillRect(-half + c * w, -half * 0.65 + r * h, w, h);
          }
        }
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-half, -half * 0.65, size, size * 0.65);
        break;
      }

      case 'tire': {
        ctx.fillStyle = sticker.color || '#222222';
        const numTracks = 6;
        const trackW = size * 0.12;
        const trackH = size * 0.25;
        for (let i = 0; i < numTracks; i++) {
          const ty = -half + i * (trackH * 1.3);
          ctx.fillRect(-half * 0.4, ty, trackW, trackH);
          ctx.fillRect(half * 0.4 - trackW, ty, trackW, trackH);
        }
        break;
      }
    }

    ctx.restore();
  }
}

export const stickerManager = new StickerManager();
