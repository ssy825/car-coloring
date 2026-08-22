/**
 * 모달 매니저 (ModalManager)
 * 갤러리, 내보내기, 도움말 모달의 열기/닫기 및 ESC 키, 백드롭 클릭 이벤트를 통합 관리합니다.
 */

export class ModalManager {
  constructor() {
    this.activeModal = null;
    this.initGlobalEvents();
  }

  initGlobalEvents() {
    // 백드롭 및 닫기 버튼 공통 이벤트 위임
    document.addEventListener('click', e => {
      if (e.target.matches('.modal-close-btn') || e.target.matches('.modal-backdrop')) {
        const modal = e.target.closest('.modal-container');
        if (modal) {
          this.close(modal);
        }
      }
    });

    // ESC 키로 최상단 활성 모달 닫기
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close(this.activeModal);
      }
    });
  }

  /**
   * 모달 열기
   */
  open(modalElement) {
    if (!modalElement) return;
    if (this.activeModal && this.activeModal !== modalElement) {
      this.close(this.activeModal);
    }
    modalElement.classList.add('active');
    this.activeModal = modalElement;
  }

  /**
   * 모달 닫기
   */
  close(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('active');
    if (this.activeModal === modalElement) {
      this.activeModal = null;
    }
  }

  /**
   * 모든 모달 닫기
   */
  closeAll() {
    document.querySelectorAll('.modal-container.active').forEach(modal => {
      modal.classList.remove('active');
    });
    this.activeModal = null;
  }
}

export const modalManager = new ModalManager();
