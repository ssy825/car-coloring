// 멀티레이어 캔버스 엔진 및 S-Pen / 터치 제스처 시스템

import { performSmartFloodFill } from './flood-fill.js';
import { brushEngine, BRUSH_TYPES } from './brushes.js';

export class CanvasEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;

    // 캔버스 크기 (기본 1920x1080 고해상도 버퍼)
    this.width = 1920;
    this.height = 1080;

    // 뷰포트 변환 (줌 및 패닝)
    this.scale = 1.0;
    this.minScale = 0.4;
    this.maxScale = 5.0;
    this.panX = 0;
    this.panY = 0;

    // 현재 도구 상태
    this.currentTool = 'brush'; // 기본: 브러시 모드
    this.previousToolBeforeBarrel = null;
    this.isBarrelButtonPressed = false;
    this.currentStrokeIsEraser = false;

    this.currentColor = '#ff2d55';
    this.currentRgb = { r: 255, g: 45, b: 85, a: 255 };
    this.brushSize = 18;
    this.brushOpacity = 1.0;

    // 포인터 및 제스처 상태
    this.isDrawing = false;
    this.activePointers = new Map();
    this.isPinching = false;
    this.initialPinchDistance = 0;
    this.initialPinchScale = 1.0;
    this.initialPinchMidpoint = { x: 0, y: 0 };
    this.initialPan = { x: 0, y: 0 };
    this.lastTapTime = 0;
    this.touchCountAtStart = 0;
    this.touchStartPositions = [];

    // 실행 취소 / 다시 실행 히스토리
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 30;

    // 현재 로드된 자동차 도안 정보
    this.currentCar = null;
    this.lineArtImage = null;

    // 콜백 함수들
    this.onHistoryChange = options.onHistoryChange || null;
    this.onColorPicked = options.onColorPicked || null;
    this.onZoomChange = options.onZoomChange || null;
    this.onSPenStateChange = options.onSPenStateChange || null;

    this.setupLayers();
    this.attachEvents();
    this.fitCanvasToContainer();

    window.addEventListener('resize', () => {
      this.fitCanvasToContainer();
    });
  }

  /**
   * 레이어 구조 생성
   */
  setupLayers() {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    this.container.style.touchAction = 'none';

    // 캔버스 래퍼 (줌/팬 transform 적용)
    this.canvasWrapper = document.createElement('div');
    this.canvasWrapper.className = 'canvas-wrapper';
    this.canvasWrapper.style.position = 'absolute';
    this.canvasWrapper.style.width = `${this.width}px`;
    this.canvasWrapper.style.height = `${this.height}px`;
    this.canvasWrapper.style.transformOrigin = '0 0';
    this.canvasWrapper.style.userSelect = 'none';
    this.canvasWrapper.style.webkitUserSelect = 'none';

    // Layer 1: Background (배경색/스튜디오)
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.width;
    this.bgCanvas.height = this.height;
    this.bgCanvas.className = 'layer bg-layer';
    this.bgCtx = this.bgCanvas.getContext('2d');

    // Layer 2: Paint (사용자 채색 & 드로잉)
    this.paintCanvas = document.createElement('canvas');
    this.paintCanvas.width = this.width;
    this.paintCanvas.height = this.height;
    this.paintCanvas.className = 'layer paint-layer';
    this.paintCtx = this.paintCanvas.getContext('2d', { willReadFrequently: true });

    // Layer 3: Line Art (도안 외곽선 - multiply 블렌드로 항상 상단에 선명하게 렌더링)
    this.lineCanvas = document.createElement('canvas');
    this.lineCanvas.width = this.width;
    this.lineCanvas.height = this.height;
    this.lineCanvas.className = 'layer line-layer';
    this.lineCanvas.style.mixBlendMode = 'multiply';
    this.lineCtx = this.lineCanvas.getContext('2d', { willReadFrequently: true });

    // Layer 4: Active Brush & Stroke Preview
    this.activeStrokeCanvas = document.createElement('canvas');
    this.activeStrokeCanvas.width = this.width;
    this.activeStrokeCanvas.height = this.height;
    this.activeStrokeCanvas.className = 'layer active-layer';
    this.activeStrokeCtx = this.activeStrokeCanvas.getContext('2d');

    // Layer 5: UI Overlay (S-Pen Hover 커서 등)
    this.uiCanvas = document.createElement('canvas');
    this.uiCanvas.width = this.width;
    this.uiCanvas.height = this.height;
    this.uiCanvas.className = 'layer ui-layer';
    this.uiCtx = this.uiCanvas.getContext('2d');

    const layers = [this.bgCanvas, this.paintCanvas, this.lineCanvas, this.activeStrokeCanvas, this.uiCanvas];
    layers.forEach(canvas => {
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      this.canvasWrapper.appendChild(canvas);
    });

    this.container.appendChild(this.canvasWrapper);

    // 기본 배경 (화이트 스튜디오)
    this.drawDefaultBackground();
  }

  drawDefaultBackground() {
    this.bgCtx.fillStyle = '#ffffff';
    this.bgCtx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * 자동차 도안 이미지 로드
   */
  async loadCar(car) {
    this.currentCar = car;
    this.clearAll();

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.lineArtImage = img;
        this.lineCtx.clearRect(0, 0, this.width, this.height);

        // 1920x1080에 맞춰 도안 비율 유지 렌더링
        const scale = Math.min((this.width * 0.94) / img.width, (this.height * 0.94) / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = (this.width - drawW) / 2;
        const drawY = (this.height - drawH) / 2;

        this.lineCtx.drawImage(img, drawX, drawY, drawW, drawH);

        // 저장된 로컬스토리지 작업 복원 시도
        this.loadSavedProgress(car.id);

        // 초기 상태 히스토리 저장
        this.history = [];
        this.historyIndex = -1;
        this.saveHistory();

        this.fitCanvasToContainer();
        resolve();
      };
      img.onerror = err => {
        console.error('Failed to load line art:', car.image, err);
        reject(err);
      };
      img.src = car.image;
    });
  }

  /**
   * 뷰포트 크기에 맞춰 캔버스 자동 스케일 및 중앙 정렬
   */
  fitCanvasToContainer() {
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // 패딩 여백 40px 확보
    const padding = 32;
    const availW = Math.max(100, rect.width - padding);
    const availH = Math.max(100, rect.height - padding);

    const scaleX = availW / this.width;
    const scaleY = availH / this.height;
    this.scale = Math.min(scaleX, scaleY);

    this.panX = (rect.width - this.width * this.scale) / 2;
    this.panY = (rect.height - this.height * this.scale) / 2;

    this.updateTransform();
    if (this.onZoomChange) {
      this.onZoomChange(Math.round(this.scale * 100));
    }
  }

  setZoom(newScale, clientX, clientY) {
    const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    if (clampedScale === this.scale) return;

    const rect = this.container.getBoundingClientRect();
    const cx = clientX !== undefined ? clientX - rect.left : rect.width / 2;
    const cy = clientY !== undefined ? clientY - rect.top : rect.height / 2;

    // 줌 중심점 기준 패닝 보정
    const factor = clampedScale / this.scale;
    this.panX = cx - (cx - this.panX) * factor;
    this.panY = cy - (cy - this.panY) * factor;
    this.scale = clampedScale;

    this.updateTransform();
    if (this.onZoomChange) {
      this.onZoomChange(Math.round(this.scale * 100));
    }
  }

  resetZoom() {
    this.fitCanvasToContainer();
  }

  updateTransform() {
    this.canvasWrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  /**
   * 화면 좌표 -> 캔버스 내부 버퍼 좌표 (1920x1080) 변환
   */
  clientToCanvas(clientX, clientY) {
    const rect = this.container.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    const canvasX = (relX - this.panX) / this.scale;
    const canvasY = (relY - this.panY) / this.scale;

    return { x: canvasX, y: canvasY };
  }

  /**
   * 포인터 및 터치 이벤트 바인딩
   */
  attachEvents() {
    const el = this.container;

    // S-Pen & 마우스 Pointer Events
    el.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    el.addEventListener('pointermove', this.handlePointerMove.bind(this));
    el.addEventListener('pointerup', this.handlePointerUp.bind(this));
    el.addEventListener('pointercancel', this.handlePointerCancel.bind(this));
    el.addEventListener('pointerleave', () => {
      this.uiCtx.clearRect(0, 0, this.width, this.height);
    });

    // 멀티터치 제스처 (Pinch Zoom & Undo/Redo)
    el.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    el.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    el.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

    // 마우스 휠 줌
    el.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

    // 컨텍스트 메뉴(우클릭) 방지 (S-Pen 버튼 클릭 호환)
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  getEffectiveTool() {
    if (this.isBarrelButtonPressed) {
      return 'eraser';
    }
    return this.currentTool;
  }

  handlePointerDown(e) {
    // 멀티터치 핀치 중일 땐 그리지 않음
    if (e.pointerType === 'touch' && e.isPrimary === false) {
      return;
    }

    // S-Pen 사이드 버튼(배럴 버튼) 감지 (buttons === 2 or 32)
    if (e.pointerType === 'pen' && (e.buttons === 2 || e.buttons === 32)) {
      this.isBarrelButtonPressed = true;
    } else {
      this.isBarrelButtonPressed = false;
    }

    this.activePointers.set(e.pointerId, {
      startX: e.clientX,
      startY: e.clientY,
      type: e.pointerType
    });

    try {
      this.container.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }

    const effectiveTool = this.getEffectiveTool();
    const { x, y } = this.clientToCanvas(e.clientX, e.clientY);

    // 유효한 드로잉 범위인지 확인
    if (x < 0 || x > this.width || y < 0 || y > this.height) {
      return;
    }

    if (effectiveTool === 'fill') {
      // 스마트 페인트통 채우기
      const success = performSmartFloodFill(
        this.paintCtx,
        this.lineCtx,
        x,
        y,
        this.currentRgb,
        42
      );
      if (success) {
        this.saveHistory();
      }
    } else if (effectiveTool === 'brush' || effectiveTool === 'eraser') {
      // 브러시 또는 지우개 드로잉 시작
      this.isDrawing = true;
      brushEngine.setSize(this.brushSize);
      brushEngine.setOpacity(this.brushOpacity);

      const isEraser = (effectiveTool === 'eraser');
      const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;
      brushEngine.startStroke(this.paintCtx, x, y, pressure, this.currentColor, isEraser);
    }
  }

  handlePointerMove(e) {
    if (e.pointerType === 'touch') {
      return;
    }

    const { x, y } = this.clientToCanvas(e.clientX, e.clientY);

    if (this.onSPenStateChange) {
      this.onSPenStateChange({
        tool: this.getEffectiveTool(),
        isPen: e.pointerType === 'pen' || e.pointerType === 'eraser',
        pressure: e.pressure || 0,
        isDrawing: this.isDrawing
      });
    }

    // 호버링 커서 가이드 업데이트 (UI Layer)
    this.drawHoverCursor(x, y, e.pointerType === 'pen' || e.pointerType === 'eraser', e.pressure);

    if (!this.isDrawing) return;

    const effectiveTool = this.getEffectiveTool();

    if (effectiveTool === 'eraser') {
      const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;
      const lastPoint = brushEngine.lastPoint || { x, y, pressure };
      brushEngine.setSize(this.brushSize);
      brushEngine.eraseSegment(
        this.paintCtx,
        lastPoint.x,
        lastPoint.y,
        x,
        y,
        pressure
      );
    } else if (effectiveTool === 'brush') {
      const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;
      const lastPoint = brushEngine.lastPoint || { x, y, pressure };
      brushEngine.setSize(this.brushSize);
      brushEngine.setOpacity(this.brushOpacity);
      brushEngine.drawSegment(
        this.paintCtx,
        lastPoint.x,
        lastPoint.y,
        x,
        y,
        pressure,
        this.currentColor
      );
    }
  }

  handlePointerUp(e) {
    if (e.pointerType === 'touch') {
      return;
    }

    this.activePointers.delete(e.pointerId);

    try {
      if (this.container.releasePointerCapture && e.pointerId) {
        this.container.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // ignore
    }

    if (this.isDrawing) {
      this.isDrawing = false;
      brushEngine.endStroke();
      this.saveHistory();
    }

    this.isBarrelButtonPressed = false;

    if (this.onSPenStateChange) {
      this.onSPenStateChange({
        tool: this.getEffectiveTool(),
        isPen: e.pointerType === 'pen',
        pressure: 0,
        isDrawing: false
      });
    }
  }

  handlePointerCancel(e) {
    if (e.pointerType === 'touch') {
      return;
    }
    this.activePointers.delete(e.pointerId);
    if (this.isDrawing) {
      this.isDrawing = false;
      brushEngine.endStroke();
    }
    this.isBarrelButtonPressed = false;
  }

  /**
   * S-Pen 호버링 커서 가이드 렌더링
   */
  drawHoverCursor(x, y, isPen = false, pressure = 0) {
    this.uiCtx.clearRect(0, 0, this.width, this.height);

    if (x < 0 || x > this.width || y < 0 || y > this.height) {
      return;
    }

    const effectiveTool = this.getEffectiveTool();

    if (effectiveTool === 'brush' || effectiveTool === 'eraser') {
      const size = this.brushSize * (isPen && pressure > 0 ? (0.5 + pressure) : 1.0);
      this.uiCtx.save();
      this.uiCtx.beginPath();
      this.uiCtx.arc(x, y, size / 2, 0, Math.PI * 2);

      if (effectiveTool === 'eraser') {
        this.uiCtx.strokeStyle = '#ff3b30';
        this.uiCtx.lineWidth = 2 / this.scale;
        this.uiCtx.setLineDash([4, 4]);
      } else {
        this.uiCtx.strokeStyle = this.currentColor;
        this.uiCtx.lineWidth = 1.5 / this.scale;
      }
      this.uiCtx.stroke();
      this.uiCtx.restore();
    }
  }

  /**
   * 터치 제스처 핸들링 (Pinch Zoom & Multi-touch Tap)
   */
  handleTouchStart(e) {
    this.touchCountAtStart = e.touches.length;
    this.touchStartPositions = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));

    if (e.touches.length === 2) {
      // 핀치 줌 / 패닝 시작
      this.isPinching = true;
      this.isDrawing = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      this.initialPinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      this.initialPinchScale = this.scale;
      this.initialPinchMidpoint = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
      this.initialPan = { x: this.panX, y: this.panY };
      e.preventDefault();
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 2 && this.isPinching) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentMidpoint = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };

      if (this.initialPinchDistance > 0) {
        const scaleChange = currentDistance / this.initialPinchDistance;
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.initialPinchScale * scaleChange));

        // 패닝 변화량 계산
        const dx = currentMidpoint.x - this.initialPinchMidpoint.x;
        const dy = currentMidpoint.y - this.initialPinchMidpoint.y;

        const rect = this.container.getBoundingClientRect();
        const midRelX = this.initialPinchMidpoint.x - rect.left;
        const midRelY = this.initialPinchMidpoint.y - rect.top;

        const factor = newScale / this.initialPinchScale;
        this.panX = this.initialPan.x + dx + (midRelX - this.initialPan.x) * (1 - factor);
        this.panY = this.initialPan.y + dy + (midRelY - this.initialPan.y) * (1 - factor);
        this.scale = newScale;

        this.updateTransform();
        if (this.onZoomChange) {
          this.onZoomChange(Math.round(this.scale * 100));
        }
      }
    }
  }

  handleTouchEnd(e) {
    if (this.isPinching && e.touches.length < 2) {
      this.isPinching = false;
    }

    // 2-Finger 탭 제스처 -> Undo
    if (this.touchCountAtStart === 2 && e.touches.length === 0) {
      const now = Date.now();
      if (now - this.lastTapTime < 350) {
        this.undo();
      }
      this.lastTapTime = now;
    }

    // 3-Finger 탭 제스처 -> Redo
    if (this.touchCountAtStart === 3 && e.touches.length === 0) {
      this.redo();
    }
  }

  handleWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    this.setZoom(this.scale * zoomFactor, e.clientX, e.clientY);
  }

  /**
   * 히스토리 (Undo / Redo) 관리
   */
  saveHistory() {
    // 현재 포인터 이후 히스토리 제거
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Paint 레이어 이미지 데이터 스냅샷 저장
    const snapshot = this.paintCtx.getImageData(0, 0, this.width, this.height);
    this.history.push(snapshot);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }

    this.notifyHistoryChange();
    this.autoSave();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const snapshot = this.history[this.historyIndex];
      this.paintCtx.putImageData(snapshot, 0, 0);
      this.notifyHistoryChange();
      this.autoSave();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const snapshot = this.history[this.historyIndex];
      this.paintCtx.putImageData(snapshot, 0, 0);
      this.notifyHistoryChange();
      this.autoSave();
    }
  }

  notifyHistoryChange() {
    if (this.onHistoryChange) {
      this.onHistoryChange({
        canUndo: this.historyIndex > 0,
        canRedo: this.historyIndex < this.history.length - 1
      });
    }
  }

  /**
   * 채색 초기화
   */
  clearPaint() {
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.saveHistory();
  }

  clearAll() {
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.lineCtx.clearRect(0, 0, this.width, this.height);
    this.activeStrokeCtx.clearRect(0, 0, this.width, this.height);
    this.uiCtx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * 자동 저장 및 복원 (LocalStorage)
   */
  autoSave() {
    if (!this.currentCar) return;
    try {
      const dataUrl = this.paintCanvas.toDataURL('image/png');
      localStorage.setItem(`car_art_${this.currentCar.id}`, dataUrl);
    } catch (e) {
      console.warn('AutoSave failed (quota exceeded?):', e);
    }
  }

  loadSavedProgress(carId) {
    try {
      const saved = localStorage.getItem(`car_art_${carId}`);
      if (saved) {
        const img = new Image();
        img.onload = () => {
          this.paintCtx.drawImage(img, 0, 0);
          this.saveHistory();
        };
        img.src = saved;
      }
    } catch (e) {
      console.warn('Failed to load saved art:', e);
    }
  }

  /**
   * 최종 이미지 병합 및 내보내기
   */
  exportMergedCanvas(bgType = 'white') {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width;
    exportCanvas.height = this.height;
    const ctx = exportCanvas.getContext('2d');

    // 1. 배경 렌더링
    if (bgType === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.width, this.height);
    } else if (bgType === 'studio') {
      const grad = ctx.createRadialGradient(
        this.width / 2, this.height * 0.45, 100,
        this.width / 2, this.height * 0.5, this.width * 0.7
      );
      grad.addColorStop(0, '#2c3647');
      grad.addColorStop(1, '#0e1219');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. 채색 레이어 합성
    ctx.drawImage(this.paintCanvas, 0, 0);

    // 3. 도안 외곽선 레이어 합성 (Multiply)
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.lineCanvas, 0, 0);
    ctx.restore();

    // 4. 서명 & 워터마크 브랜딩
    ctx.save();
    ctx.fillStyle = bgType === 'studio' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)';
    ctx.font = 'bold 20px Outfit, Montserrat, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🏎️ CAR COLORING STUDIO PRO', this.width - 40, this.height - 30);
    ctx.restore();

    return exportCanvas;
  }

  exportMergedImage(bgType = 'white') {
    const canvas = this.exportMergedCanvas(bgType);
    return canvas.toDataURL('image/png');
  }

  downloadImage(filename, bgType = 'white') {
    const name = filename || `${this.currentCar ? this.currentCar.name : 'my_car'}_coloring.png`;
    const dataUrl = this.exportMergedImage(bgType);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  printArtwork() {
    const dataUrl = this.exportMergedImage('white');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>인쇄 - ${this.currentCar ? this.currentCar.name : '자동차 색칠'}</title>
        <style>
          body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
          img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          @page { size: landscape; margin: 10mm; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print();window.close();" />
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
