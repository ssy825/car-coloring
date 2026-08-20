// S-Pen 필압 지원 및 브러시 엔진 모듈

export const BRUSH_TYPES = {
  pen: { id: 'pen', name: '정밀 펜', icon: '✒️', desc: '필압에 민감하게 반응하는 선명한 잉크 펜' },
  marker: { id: 'marker', name: '마커', icon: '🖊️', desc: '넓고 부드러운 반투명 마커' },
  crayon: { id: 'crayon', name: '크레용', icon: '🖍️', desc: '거칠고 따뜻한 질감의 크레용/색연필' },
  airbrush: { id: 'airbrush', name: '에어브러시', icon: '💨', desc: '부드럽게 흩뿌려지는 스프레이' },
  neon: { id: 'neon', name: '네온 글로우', icon: '✨', desc: '빛을 발산하는 사이버 네온 라이트' },
  watercolor: { id: 'watercolor', name: '수채화', icon: '🎨', desc: '자연스럽게 번지는 수채화 붓' }
};

export class BrushEngine {
  constructor() {
    this.currentBrush = 'pen';
    this.size = 18;
    this.opacity = 1.0;
    this.pressureEnabled = true;
    this.lastPoint = null;
  }

  setBrush(type) {
    if (BRUSH_TYPES[type]) {
      this.currentBrush = type;
    }
  }

  setSize(size) {
    this.size = Math.max(2, Math.min(100, size));
  }

  setOpacity(opacity) {
    this.opacity = Math.max(0.05, Math.min(1.0, opacity));
  }

  /**
   * 스트로크 시작
   */
  startStroke(ctx, x, y, pressure = 0.5, color = '#000000', isEraser = false) {
    this.lastPoint = { x, y, pressure };
    if (isEraser) {
      this.eraseSegment(ctx, x, y, x, y, pressure);
    } else {
      this.drawSegment(ctx, x, y, x, y, pressure, color);
    }
  }

  /**
   * 지우개 선 그리기 (외곽선 보존 및 Paint 레이어 픽셀 투명화)
   */
  eraseSegment(ctx, x1, y1, x2, y2, pressure = 0.5) {
    const effectivePressure = this.pressureEnabled && pressure > 0 ? pressure : 0.6;
    const baseSize = this.size;
    const currentSize = Math.max(4, baseSize * (0.8 + effectivePressure * 0.8));

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const dist = Math.hypot(x2 - x1, y2 - y1);
    if (dist < 0.5) {
      // 단일 탭/클릭 시 원형으로 확실히 지우기
      ctx.beginPath();
      ctx.arc(x1, y1, currentSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
    this.lastPoint = { x: x2, y: y2, pressure };
  }

  /**
   * 브러시 선 그리기 (이전 점 ~ 현재 점 보간)
   */
  drawSegment(ctx, x1, y1, x2, y2, pressure = 0.5, color = '#000000') {
    // S-Pen 필압 계수 계산 (압력이 0이거나 미지원 기기일 땐 0.6 기본값)
    const effectivePressure = this.pressureEnabled && pressure > 0 ? pressure : 0.6;
    const baseSize = this.size;

    ctx.save();
    // 반드시 일반 드로잉 블렌드 모드로 보장
    ctx.globalCompositeOperation = 'source-over';

    const dist = Math.hypot(x2 - x1, y2 - y1);

    switch (this.currentBrush) {
      case 'pen': {
        // 필압에 따른 굵기 가변 (0.4배 ~ 1.6배)
        const currentSize = Math.max(1, baseSize * (0.4 + effectivePressure * 1.2));
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = this.opacity;

        if (dist < 0.5) {
          ctx.beginPath();
          ctx.arc(x1, y1, currentSize / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        break;
      }

      case 'marker': {
        const currentSize = baseSize * 1.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = Math.min(0.45, this.opacity * 0.45);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        break;
      }

      case 'crayon': {
        const currentSize = Math.max(2, baseSize * (0.6 + effectivePressure * 0.8));
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(1, Math.floor(dist / 2));

        ctx.fillStyle = color;
        ctx.globalAlpha = this.opacity * 0.7;

        for (let i = 0; i <= steps; i++) {
          const t = steps === 0 ? 0 : i / steps;
          const cx = x1 + (x2 - x1) * t;
          const cy = y1 + (y2 - y1) * t;

          // 노이즈 점들을 산포하여 크레용 질감 생성
          const particles = Math.floor(currentSize * 1.2);
          for (let p = 0; p < particles; p++) {
            const angle = Math.random() * Math.PI * 2;
            const r = (Math.random() * currentSize) / 2;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            const pSize = Math.random() * 2.2 + 0.8;

            ctx.fillRect(px, py, pSize, pSize);
          }
        }
        break;
      }

      case 'airbrush': {
        const currentSize = baseSize * 2.2;
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(1, Math.floor(dist / 3));

        ctx.fillStyle = color;
        ctx.globalAlpha = Math.min(0.2, this.opacity * 0.2);

        for (let i = 0; i <= steps; i++) {
          const t = steps === 0 ? 0 : i / steps;
          const cx = x1 + (x2 - x1) * t;
          const cy = y1 + (y2 - y1) * t;

          const count = Math.floor(currentSize * 0.8 * effectivePressure);
          for (let p = 0; p < count; p++) {
            const angle = Math.random() * Math.PI * 2;
            const r = (Math.random() + Math.random()) / 2 * currentSize;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            const pSize = Math.random() * 1.8 + 0.5;

            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'neon': {
        const currentSize = Math.max(2, baseSize * (0.5 + effectivePressure * 0.8));
        
        // 외곽 글로우 후광
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = currentSize * 1.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = currentSize * 1.4;
        ctx.globalAlpha = this.opacity * 0.7;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();

        // 중심부 하얀 코어
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, currentSize * 0.35);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.95;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'watercolor': {
        const currentSize = baseSize * 2.0;
        ctx.strokeStyle = color;
        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = Math.min(0.2, this.opacity * 0.18 * effectivePressure);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
    this.lastPoint = { x: x2, y: y2, pressure };
  }

  endStroke() {
    this.lastPoint = null;
  }
}

export const brushEngine = new BrushEngine();
