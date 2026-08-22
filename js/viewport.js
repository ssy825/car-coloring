/**
 * 뷰포트 변환 및 줌/팬 제스처 컨트롤러 (ViewportController)
 * 캔버스의 확대/축소, 화면 맞춤, 패닝, 핀치 줌 및 화면-캔버스 좌표 변환을 전담합니다.
 */

export class ViewportController {
  constructor(container, wrapper, options = {}) {
    this.container = container;
    this.wrapper = wrapper;
    this.width = options.width || 1920;
    this.height = options.height || 1080;

    this.scale = 1.0;
    this.minScale = options.minScale || 0.4;
    this.maxScale = options.maxScale || 5.0;
    this.panX = 0;
    this.panY = 0;

    // 핀치 줌 상태
    this.isPinching = false;
    this.initialPinchDistance = 0;
    this.initialPinchScale = 1.0;
    this.initialPinchMidpoint = { x: 0, y: 0 };
    this.initialPan = { x: 0, y: 0 };

    this.onZoomChange = options.onZoomChange || null;
  }

  /**
   * 컨테이너 크기에 맞춰 캔버스 스케일 및 중앙 정렬
   */
  fitToContainer(padding = 32) {
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const availW = Math.max(100, rect.width - padding);
    const availH = Math.max(100, rect.height - padding);

    const scaleX = availW / this.width;
    const scaleY = availH / this.height;
    this.scale = Math.min(scaleX, scaleY);

    this.panX = (rect.width - this.width * this.scale) / 2;
    this.panY = (rect.height - this.height * this.scale) / 2;

    this.applyTransform();
    this.notifyZoom();
  }

  /**
   * 지정한 배율로 줌 변경 (중심점 기준 확대/축소 보정)
   */
  setZoom(newScale, clientX, clientY) {
    const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    if (clampedScale === this.scale) return;

    const rect = this.container.getBoundingClientRect();
    const cx = clientX !== undefined ? clientX - rect.left : rect.width / 2;
    const cy = clientY !== undefined ? clientY - rect.top : rect.height / 2;

    // 줌 중심점 기준 패닝 좌표 보정
    const factor = clampedScale / this.scale;
    this.panX = cx - (cx - this.panX) * factor;
    this.panY = cy - (cy - this.panY) * factor;
    this.scale = clampedScale;

    this.applyTransform();
    this.notifyZoom();
  }

  /**
   * 줌 초기화 (화면 맞춤)
   */
  resetZoom() {
    this.fitToContainer();
  }

  /**
   * CSS Transform 적용
   */
  applyTransform() {
    this.wrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  /**
   * 줌 변경 콜백 호출
   */
  notifyZoom() {
    if (this.onZoomChange) {
      this.onZoomChange(Math.round(this.scale * 100));
    }
  }

  /**
   * 브라우저 화면 좌표 (clientX, clientY) -> 캔버스 내부 버퍼 좌표 (1920x1080) 변환
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
   * 마우스 휠 줌 핸들링
   */
  handleWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    this.setZoom(this.scale * zoomFactor, e.clientX, e.clientY);
  }

  /**
   * 핀치 제스처 시작 (두 손가락 터치 시)
   */
  startPinch(touches) {
    if (touches.length < 2) return;
    this.isPinching = true;

    const t1 = touches[0];
    const t2 = touches[1];

    this.initialPinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    this.initialPinchScale = this.scale;
    this.initialPinchMidpoint = {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
    this.initialPan = { x: this.panX, y: this.panY };
  }

  /**
   * 핀치 제스처 진행
   */
  updatePinch(touches) {
    if (!this.isPinching || touches.length < 2 || this.initialPinchDistance <= 0) return;

    const t1 = touches[0];
    const t2 = touches[1];
    const currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const currentMidpoint = {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };

    const scaleChange = currentDistance / this.initialPinchDistance;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.initialPinchScale * scaleChange));

    const dx = currentMidpoint.x - this.initialPinchMidpoint.x;
    const dy = currentMidpoint.y - this.initialPinchMidpoint.y;

    const rect = this.container.getBoundingClientRect();
    const midRelX = this.initialPinchMidpoint.x - rect.left;
    const midRelY = this.initialPinchMidpoint.y - rect.top;

    const factor = newScale / this.initialPinchScale;
    this.panX = this.initialPan.x + dx + (midRelX - this.initialPan.x) * (1 - factor);
    this.panY = this.initialPan.y + dy + (midRelY - this.initialPan.y) * (1 - factor);
    this.scale = newScale;

    this.applyTransform();
    this.notifyZoom();
  }

  /**
   * 핀치 제스처 종료
   */
  endPinch() {
    this.isPinching = false;
  }
}
