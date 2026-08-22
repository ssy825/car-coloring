/**
 * 히스토리 관리자 (HistoryManager)
 * 실행 취소(Undo) / 다시 실행(Redo) 상태 및 스택을 관리합니다.
 */

export class HistoryManager {
  constructor(options = {}) {
    this.maxHistory = options.maxHistory || 30;
    this.history = [];
    this.historyIndex = -1;
    this.onHistoryChange = options.onHistoryChange || null;
  }

  get canUndo() {
    return this.historyIndex > 0;
  }

  get canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * 현재 Paint 레이어 상태 스냅샷 저장
   */
  saveSnapshot(paintCtx, width, height) {
    if (!paintCtx) return;

    // 현재 인덱스 이후의 Redo 히스토리 제거
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    const snapshot = paintCtx.getImageData(0, 0, width, height);
    this.history.push(snapshot);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }

    this.notifyChange();
  }

  /**
   * 실행 취소 (Undo)
   */
  undo(paintCtx) {
    if (!this.canUndo || !paintCtx) return false;

    this.historyIndex--;
    const snapshot = this.history[this.historyIndex];
    paintCtx.putImageData(snapshot, 0, 0);
    this.notifyChange();
    return true;
  }

  /**
   * 다시 실행 (Redo)
   */
  redo(paintCtx) {
    if (!this.canRedo || !paintCtx) return false;

    this.historyIndex++;
    const snapshot = this.history[this.historyIndex];
    paintCtx.putImageData(snapshot, 0, 0);
    this.notifyChange();
    return true;
  }

  /**
   * 히스토리 스택 초기화
   */
  clear() {
    this.history = [];
    this.historyIndex = -1;
    this.notifyChange();
  }

  notifyChange() {
    if (this.onHistoryChange) {
      this.onHistoryChange({
        canUndo: this.canUndo,
        canRedo: this.canRedo,
        historyIndex: this.historyIndex,
        total: this.history.length
      });
    }
  }
}
