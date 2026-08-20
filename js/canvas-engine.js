// 멀티레이어 캔버스 엔진 및 S-Pen / 터치 제스처 시스템

import { performSmartFloodFill } from './flood-fill.js';
import { brushEngine, BRUSH_TYPES } from './brushes.js';
import { stickerManager } from './stickers.js';
import { soundFx } from './audio-fx.js';

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
    this.currentTool = 'fill'; // 'fill', 'brush', 'eraser', 'eyedropper', 'sticker'
    this.previousToolBeforeBarrel = null; // S-Pen 버튼 누를 때 이전 도구 기억
    this.isBarrelButtonPressed = false;
    this.currentStrokeIsEraser = false; // 현재 진행 중인 스트로크가 지우개인지 여부

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

    // Layer 2: Paint (사용자 채색 & 데칼)
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
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.lineArtImage = img;

        // 원본 이미지 크기에 맞게 캔버스 크기 조정 (기본 1920x1080 또는 이미지 원본)
        this.width = img.naturalWidth || 1920;
        this.height = img.naturalHeight || 1080;

        [this.bgCanvas, this.paintCanvas, this.lineCanvas, this.activeStrokeCanvas, this.uiCanvas].forEach(c => {
          c.width = this.width;
          c.height = this.height;
        });
        this.canvasWrapper.style.width = `${this.width}px`;
        this.canvasWrapper.style.height = `${this.height}px`;

        // 캔버스 초기화
        this.drawDefaultBackground();
        this.paintCtx.clearRect(0, 0, this.width, this.height);
        this.lineCtx.clearRect(0, 0, this.width, this.height);

        // 도안 라인아트 그리기
        this.lineCtx.drawImage(img, 0, 0, this.width, this.height);

        // 로컬 저장소에 저장된 채색 내역이 있는지 확인
        this.restoreSavedState(car.id);

        // 초기 상태 히스토리 저장
        this.history = [];
        this.historyIndex = -1;
        this.saveHistory();

        this.fitCanvasToContainer();
        soundFx.playPop();
        resolve();
      };
      img.onerror = reject;
      img.src = car.image;
    });
  }

  /**
   * 컨테이너 크기에 맞춰 캔버스 화면 중앙 정렬 및 스케일 조정
   */
  fitCanvasToContainer() {
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const padding = 20;
    const availW = rect.width - padding * 2;
    const availH = rect.height - padding * 2;

    const scaleW = availW / this.width;
    const scaleH = availH / this.height;
    const initialScale = Math.min(scaleW, scaleH, 1.2);

    this.scale = Math.max(this.minScale, Math.min(this.maxScale, initialScale));
    this.panX = (rect.width - this.width * this.scale) / 2;
    this.panY = (rect.height - this.height * this.scale) / 2;

    this.updateTransform();
    if (this.onZoomChange) {
      this.onZoomChange(Math.round(this.scale * 100));
    }
  }

  updateTransform() {
    this.canvasWrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  setZoom(newScale, centerClientX = null, centerClientY = null) {
    const rect = this.container.getBoundingClientRect();
    const cx = centerClientX !== null ? centerClientX - rect.left : rect.width / 2;
    const cy = centerClientY !== null ? centerClientY - rect.top : rect.height / 2;

    const prevScale = this.scale;
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));

    // 마우스/터치 중심점을 기준으로 줌
    const factor = this.scale / prevScale;
    this.panX = cx - (cx - this.panX) * factor;
    this.panY = cy - (cy - this.panY) * factor;

    this.updateTransform();
    if (this.onZoomChange) {
      this.onZoomChange(Math.round(this.scale * 100));
    }
  }

  resetZoom() {
    this.fitCanvasToContainer();
  }

  /**
   * 화면 Client 좌표를 캔버스 내부 좌표로 변환
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
   * 이벤트 리스너 등록 (Pointer Events & Touch Events)
   */
  attachEvents() {
    const container = this.container;

    // 우클릭 및 컨텍스트 메뉴 기본 동작 차단
    const preventContextMenu = e => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    container.addEventListener('contextmenu', preventContextMenu, { capture: true });
    window.addEventListener('contextmenu', preventContextMenu, { capture: true });

    // Pointer Events (pointerdown, pointermove, pointerup, pointercancel)
    container.addEventListener('pointerdown', this.handlePointerDown.bind(this), { passive: false });
    window.addEventListener('pointermove', this.handlePointerMove.bind(this), { passive: false });
    window.addEventListener('pointerup', this.handlePointerUp.bind(this), { passive: false });
    window.addEventListener('pointercancel', this.handlePointerCancel.bind(this), { passive: false });
    container.addEventListener('pointerleave', this.handlePointerLeave.bind(this), { passive: false });

    // Wheel (데스크톱 마우스 휠 줌/팬)
    container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

    // Touch Events for multi-touch (2-finger tap undo, 3-finger tap redo, pinch)
    container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }

  handlePointerLeave(e) {
    this.uiCtx.clearRect(0, 0, this.width, this.height);
    if (this.onSPenStateChange) {
      this.onSPenStateChange({
        tool: this.currentTool,
        isPen: false,
        pressure: 0,
        isDrawing: false
      });
    }
  }

  getEffectiveTool() {
    return this.currentTool;
  }

  handlePointerDown(e) {
    if (e.target !== this.container && !this.container.contains(e.target)) return;

    try {
      if (this.container.setPointerCapture && e.pointerId) {
        this.container.setPointerCapture(e.pointerId);
      }
    } catch (err) {
      // ignore
    }

    // 손가락 터치가 2개 이상이면 제스처 모드로 전환 (팜 리젝션)
    if (e.pointerType === 'touch' && this.activePointers.size >= 1) {
      this.isDrawing = false;
      return;
    }

    this.activePointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType
    });

    if (this.onSPenStateChange) {
      this.onSPenStateChange({
        tool: this.currentTool,
        isPen: e.pointerType === 'pen' || e.pointerType === 'eraser',
        pressure: e.pressure || 0,
        isDrawing: true
      });
    }

    const effectiveTool = this.currentTool;
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
        soundFx.playFill();
        this.saveHistory();
      }
    } else if (effectiveTool === 'eyedropper') {
      // 색상 추출
      this.pickColorAt(x, y);
    } else if (effectiveTool === 'sticker') {
      // 스티커 스탬프
      if (stickerManager.selectedSticker) {
        stickerManager.drawSticker(this.paintCtx, stickerManager.selectedSticker, x, y, 70);
        soundFx.playPop();
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
      soundFx.playBrushStroke();
    }
  }

  handlePointerMove(e) {
    const { x, y } = this.clientToCanvas(e.clientX, e.clientY);

    if (this.onSPenStateChange) {
      this.onSPenStateChange({
        tool: this.currentTool,
        isPen: e.pointerType === 'pen' || e.pointerType === 'eraser',
        pressure: e.pressure || 0,
        isDrawing: this.isDrawing
      });
    }

    // 호버링 커서 가이드 업데이트 (UI Layer)
    this.drawHoverCursor(x, y, e.pointerType === 'pen' || e.pointerType === 'eraser', e.pressure);

    if (!this.isDrawing) return;

    const effectiveTool = this.currentTool;

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

    if (this.onSPenStateChange) {
      this.onSPenStateChange({
        tool: this.currentTool,
        isPen: e.pointerType === 'pen',
        pressure: 0,
        isDrawing: false
      });
    }
  }

  handlePointerCancel(e) {
    this.emitDebugEvent('pointercancel', e);
    this.activePointers.delete(e.pointerId);
    if (this.isDrawing) {
      this.isDrawing = false;
      this.currentStrokeIsEraser = false;
      brushEngine.endStroke();
    }
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
        soundFx.playUndo();
      }
      this.lastTapTime = now;
    }

    // 3-Finger 탭 제스처 -> Redo
    if (this.touchCountAtStart === 3 && e.touches.length === 0) {
      this.redo();
      soundFx.playPop();
    }
  }

  handleWheel(e) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || true) {
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      this.setZoom(this.scale * zoomFactor, e.clientX, e.clientY);
    }
  }

  /**
   * 스포이드 색상 추출
   */
  pickColorAt(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

    // Paint 레이어 우선, 없으면 흰색
    const pixel = this.paintCtx.getImageData(x, y, 1, 1).data;
    if (pixel[3] > 10) {
      const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('');
      if (this.onColorPicked) {
        this.onColorPicked(hex);
      }
      soundFx.playClick();
    }
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
      return true;
    }
    return false;
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const snapshot = this.history[this.historyIndex];
      this.paintCtx.putImageData(snapshot, 0, 0);
      this.notifyHistoryChange();
      this.autoSave();
      return true;
    }
    return false;
  }

  clearPaint() {
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.saveHistory();
    soundFx.playUndo();
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
   * 로컬 스토리지 자동 저장
   */
  autoSave() {
    if (!this.currentCar) return;
    try {
      const dataUrl = this.paintCanvas.toDataURL('image/png');
      localStorage.setItem(`car_coloring_${this.currentCar.id}`, dataUrl);
    } catch (e) {
      console.warn('AutoSave to localStorage failed:', e);
    }
  }

  restoreSavedState(carId) {
    try {
      const saved = localStorage.getItem(`car_coloring_${carId}`);
      if (saved) {
        const img = new Image();
        img.onload = () => {
          this.paintCtx.drawImage(img, 0, 0);
          this.saveHistory();
        };
        img.src = saved;
      }
    } catch (e) {
      console.warn('Failed to restore saved car state:', e);
    }
  }

  /**
   * 완성 작품을 고화질 PNG로 합성 내보내기
   * @param {string} backgroundType - 'white', 'transparent', 'studio'
   */
  exportMergedImage(backgroundType = 'white') {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width;
    exportCanvas.height = this.height;
    const ctx = exportCanvas.getContext('2d');

    // 1. 배경
    if (backgroundType === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.width, this.height);
    } else if (backgroundType === 'studio') {
      // 모던 스튜디오 그라데이션
      const grad = ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, '#f5f7fa');
      grad.addColorStop(1, '#c3cfe2');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. 채색 레이어
    ctx.drawImage(this.paintCanvas, 0, 0);

    // 3. 도안 외곽선 레이어 (multiply)
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.lineCanvas, 0, 0);
    ctx.restore();

    return exportCanvas.toDataURL('image/png');
  }

  downloadImage(fileName = null, backgroundType = 'white') {
    const dataUrl = this.exportMergedImage(backgroundType);
    const carName = this.currentCar ? this.currentCar.name.replace(/\s+/g, '_') : 'my_car';
    const finalName = fileName || `${carName}_colored.png`;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    soundFx.playSuccess();
  }

  printArtwork() {
    const dataUrl = this.exportMergedImage('white');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${this.currentCar ? this.currentCar.name : 'Car Coloring'}</title>
          <style>
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fff; }
            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" onload="window.print(); window.close();" />
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  }
}
