/**
 * 멀티레이어 캔버스 엔진 (CanvasEngine)
 * 레이어 관리, 포인터/스타일러스 입력 처리, 제스처 및 드로잉을 오케스트레이션합니다.
 */

import { ViewportController } from './viewport.js';
import { HistoryManager } from './history.js';
import { ExportService } from './export-service.js';
import { performSmartFloodFill } from './flood-fill.js';
import { brushEngine } from './brushes.js';
import { storageManager } from './storage.js';
import { soundFx } from './audio-fx.js';

export class CanvasEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;

    // 내부 버퍼 고해상도 규격 (1920x1080)
    this.width = options.width || 1920;
    this.height = options.height || 1080;

    // 현재 도구 및 채색 상태
    this.currentTool = 'brush';
    this.isBarrelButtonPressed = false;
    this.currentColor = '#ff2d55';
    this.currentRgb = { r: 255, g: 45, b: 85, a: 255 };
    this.brushSize = 18;
    this.brushOpacity = 1.0;

    // 드로잉 및 터치 상태
    this.isDrawing = false;
    this.activePointers = new Map();
    this.lastTapTime = 0;
    this.touchCountAtStart = 0;

    // 로드된 자동차 도안 정보
    this.currentCar = null;
    this.lineArtImage = null;

    // 콜백 함수
    this.onHistoryChange = options.onHistoryChange || null;
    this.onZoomChange = options.onZoomChange || null;
    this.onSPenStateChange = options.onSPenStateChange || null;

    this.setupLayers();
    this.initSubsystems();
    this.attachEvents();
    this.fitCanvasToContainer();

    window.addEventListener('resize', () => {
      this.fitCanvasToContainer();
    });
  }

  get scale() {
    return this.viewport ? this.viewport.scale : 1.0;
  }

  get panX() {
    return this.viewport ? this.viewport.panX : 0;
  }

  get panY() {
    return this.viewport ? this.viewport.panY : 0;
  }

  /**
   * 5단계 멀티레이어 구조 생성
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

    // Layer 1: Background (배경)
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

    // Layer 3: Line Art (도안 외곽선 - multiply 블렌드로 상단 렌더링)
    this.lineCanvas = document.createElement('canvas');
    this.lineCanvas.width = this.width;
    this.lineCanvas.height = this.height;
    this.lineCanvas.className = 'layer line-layer';
    this.lineCanvas.style.mixBlendMode = 'multiply';
    this.lineCtx = this.lineCanvas.getContext('2d', { willReadFrequently: true });

    // Layer 4: Active Stroke Preview
    this.activeStrokeCanvas = document.createElement('canvas');
    this.activeStrokeCanvas.width = this.width;
    this.activeStrokeCanvas.height = this.height;
    this.activeStrokeCanvas.className = 'layer active-layer';
    this.activeStrokeCtx = this.activeStrokeCanvas.getContext('2d');

    // Layer 5: UI Overlay (S-Pen Hover 커서)
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
    this.drawDefaultBackground();
  }

  /**
   * 뷰포트 및 히스토리 서브시스템 초기화
   */
  initSubsystems() {
    this.viewport = new ViewportController(this.container, this.canvasWrapper, {
      width: this.width,
      height: this.height,
      minScale: 0.4,
      maxScale: 5.0,
      onZoomChange: zoomPercent => {
        if (this.onZoomChange) this.onZoomChange(zoomPercent);
      }
    });

    this.historyManager = new HistoryManager({
      maxHistory: 30,
      onHistoryChange: state => {
        if (this.onHistoryChange) this.onHistoryChange(state);
      }
    });
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
      img.onload = async () => {
        this.lineArtImage = img;
        this.lineCtx.clearRect(0, 0, this.width, this.height);

        // 1920x1080에 맞춰 도안 비율 유지 중앙 렌더링
        const scale = Math.min((this.width * 0.94) / img.width, (this.height * 0.94) / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = (this.width - drawW) / 2;
        const drawY = (this.height - drawH) / 2;

        this.lineCtx.drawImage(img, drawX, drawY, drawW, drawH);

        // 저장된 채색 데이터 복원 시도
        await this.loadSavedProgress(car.id);

        // 초기 상태 히스토리 저장
        this.historyManager.clear();
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

  fitCanvasToContainer() {
    if (this.viewport) {
      this.viewport.fitToContainer();
    }
  }

  setZoom(newScale, clientX, clientY) {
    if (this.viewport) {
      this.viewport.setZoom(newScale, clientX, clientY);
    }
  }

  resetZoom() {
    if (this.viewport) {
      this.viewport.resetZoom();
    }
  }

  clientToCanvas(clientX, clientY) {
    return this.viewport ? this.viewport.clientToCanvas(clientX, clientY) : { x: 0, y: 0 };
  }

  /**
   * 포인터 및 제스처 이벤트 바인딩
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

    // 멀티터치 제스처 (Pinch Zoom & Multi-tap)
    el.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    el.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    el.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

    // 마우스 휠 줌
    el.addEventListener('wheel', e => {
      if (this.viewport) this.viewport.handleWheel(e);
    }, { passive: false });

    // 우클릭 방지 (S-Pen 버튼 호환)
    el.addEventListener('contextmenu', e => e.preventDefault());

    // 이탈 시 즉시 자동 저장
    const handleExitSave = () => {
      if (this.currentCar && this.paintCanvas) {
        storageManager.saveCarWork(this.currentCar.id, this.paintCanvas, this.lineCanvas);
      }
    };
    window.addEventListener('beforeunload', handleExitSave);
    window.addEventListener('pagehide', handleExitSave);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleExitSave();
      }
    });
  }

  getEffectiveTool() {
    if (this.isBarrelButtonPressed) {
      return 'eraser';
    }
    return this.currentTool;
  }

  handlePointerDown(e) {
    if (e.pointerType === 'touch' && e.isPrimary === false) {
      return;
    }

    // S-Pen 배럴 버튼 (buttons === 2 or 32)
    if (e.pointerType === 'pen' && (e.buttons === 2 || e.buttons === 32 || (e.buttons & 2) || (e.buttons & 32))) {
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

    if (x < 0 || x > this.width || y < 0 || y > this.height) {
      return;
    }

    if (effectiveTool === 'fill') {
      const success = performSmartFloodFill(
        this.paintCtx,
        this.lineCtx,
        x,
        y,
        this.currentRgb,
        42
      );
      if (success) {
        soundFx.playFill();
        this.saveHistory();
      }
    } else if (effectiveTool === 'brush' || effectiveTool === 'eraser') {
      this.isDrawing = true;
      brushEngine.setSize(this.brushSize);
      brushEngine.setOpacity(this.brushOpacity);

      const isEraser = effectiveTool === 'eraser';
      const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;
      brushEngine.startStroke(this.paintCtx, x, y, pressure, this.currentColor, isEraser);
      soundFx.playBrushStroke();
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

    this.drawHoverCursor(x, y, e.pointerType === 'pen' || e.pointerType === 'eraser', e.pressure);

    if (!this.isDrawing) return;

    const effectiveTool = this.getEffectiveTool();
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;
    const lastPoint = brushEngine.lastPoint || { x, y, pressure };

    if (effectiveTool === 'eraser') {
      brushEngine.setSize(this.brushSize);
      brushEngine.eraseSegment(this.paintCtx, lastPoint.x, lastPoint.y, x, y, pressure);
    } else if (effectiveTool === 'brush') {
      brushEngine.setSize(this.brushSize);
      brushEngine.setOpacity(this.brushOpacity);
      brushEngine.drawSegment(this.paintCtx, lastPoint.x, lastPoint.y, x, y, pressure, this.currentColor);
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

  drawHoverCursor(x, y, isPen = false, pressure = 0) {
    this.uiCtx.clearRect(0, 0, this.width, this.height);

    if (x < 0 || x > this.width || y < 0 || y > this.height) {
      return;
    }

    const effectiveTool = this.getEffectiveTool();

    if (effectiveTool === 'brush' || effectiveTool === 'eraser') {
      const size = this.brushSize * (isPen && pressure > 0 ? 0.5 + pressure : 1.0);
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

  handleTouchStart(e) {
    this.touchCountAtStart = e.touches.length;

    if (e.touches.length === 2 && this.viewport) {
      this.isDrawing = false;
      this.viewport.startPinch(e.touches);
      e.preventDefault();
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 2 && this.viewport && this.viewport.isPinching) {
      e.preventDefault();
      this.viewport.updatePinch(e.touches);
    }
  }

  handleTouchEnd(e) {
    if (this.viewport && this.viewport.isPinching && e.touches.length < 2) {
      this.viewport.endPinch();
    }

    // 2-Finger 더블 탭 제스처 -> Undo
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

  saveHistory() {
    this.historyManager.saveSnapshot(this.paintCtx, this.width, this.height);
    this.autoSave();
  }

  undo() {
    if (this.historyManager.undo(this.paintCtx)) {
      soundFx.playUndo();
      this.autoSave();
    }
  }

  redo() {
    if (this.historyManager.redo(this.paintCtx)) {
      soundFx.playPop();
      this.autoSave();
    }
  }

  async clearPaint() {
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    if (this.currentCar) {
      await storageManager.deleteCarWork(this.currentCar.id);
    }
    this.saveHistory();
  }

  clearAll() {
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.lineCtx.clearRect(0, 0, this.width, this.height);
    this.activeStrokeCtx.clearRect(0, 0, this.width, this.height);
    this.uiCtx.clearRect(0, 0, this.width, this.height);
  }

  autoSave() {
    if (!this.currentCar) return;
    storageManager.scheduleAutoSave(this.currentCar.id, this.paintCanvas, this.lineCanvas);
  }

  async loadSavedProgress(carId) {
    try {
      const saved = await storageManager.loadCarWork(carId);
      if (saved && (saved.fullDataUrl || saved.thumbDataUrl)) {
        return new Promise(resolve => {
          const img = new Image();
          img.onload = () => {
            this.paintCtx.clearRect(0, 0, this.width, this.height);
            this.paintCtx.drawImage(img, 0, 0);
            resolve(true);
          };
          img.onerror = () => resolve(false);
          img.src = saved.fullDataUrl || saved.thumbDataUrl;
        });
      }
    } catch (e) {
      console.warn('Failed to load saved art:', e);
    }
    return false;
  }

  exportMergedCanvas(bgType = 'white') {
    return ExportService.createMergedCanvas(this.paintCanvas, this.lineCanvas, this.width, this.height, bgType);
  }

  exportMergedImage(bgType = 'white') {
    return ExportService.getMergedDataUrl(this.paintCanvas, this.lineCanvas, this.width, this.height, bgType);
  }

  downloadImage(filename, bgType = 'white') {
    const name = filename || `${this.currentCar ? this.currentCar.name : 'my_car'}_coloring.png`;
    ExportService.downloadPng(this.paintCanvas, this.lineCanvas, this.width, this.height, name, bgType);
    soundFx.playSuccess();
  }

  printArtwork() {
    const title = this.currentCar ? this.currentCar.name : '자동차 색칠';
    ExportService.printArtwork(this.paintCanvas, this.lineCanvas, this.width, this.height, title);
  }
}
