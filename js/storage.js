/**
 * IndexedDB & LocalStorage 기반 자동차 색칠 데이터 스토리지 매니저 (StorageManager)
 * 비동기 디바운스 자동 저장, 고속 메타데이터 캐시, 썸네일 생성 및 복원 기능을 제공합니다.
 */

const DB_NAME = 'CarColoringStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'car_artwork';

class StorageManager {
  constructor() {
    this.db = null;
    this.dbPromise = this.initDB();
    this.cachedMeta = new Map();
    this.debounceTimers = new Map();
  }

  async initDB() {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return null;
    }

    return new Promise(resolve => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'carId' });
        }
      };

      request.onsuccess = event => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = event => {
        console.warn('IndexedDB open error, using LocalStorage fallback:', event.target.error);
        resolve(null);
      };
    });
  }

  /**
   * 320x180 규격의 경량 합성 썸네일 생성
   */
  generateThumbnail(paintCanvas, lineCanvas, width = 320, height = 180) {
    try {
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = width;
      thumbCanvas.height = height;
      const ctx = thumbCanvas.getContext('2d');

      // 1. 화이트 배경
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 2. 페인트 레이어 리스케일링
      if (paintCanvas) {
        ctx.drawImage(paintCanvas, 0, 0, width, height);
      }

      // 3. 도안 외곽선 Multiply 합성
      if (lineCanvas) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(lineCanvas, 0, 0, width, height);
        ctx.restore();
      }

      return thumbCanvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      console.warn('Thumbnail generation failed:', e);
      return null;
    }
  }

  /**
   * 캔버스에 실제 채색된 픽셀이 있는지 고속 샘플링 검사
   */
  hasActualDrawing(paintCanvas) {
    if (!paintCanvas) return false;
    try {
      const ctx = paintCanvas.getContext('2d', { willReadFrequently: true });
      const imgData = ctx.getImageData(0, 0, paintCanvas.width, paintCanvas.height);
      const data = imgData.data;

      // 16픽셀 간격 샘플링 검사
      const step = 4 * 16;
      for (let i = 3; i < data.length; i += step) {
        if (data[i] > 10) {
          return true;
        }
      }
      return false;
    } catch (e) {
      return true;
    }
  }

  /**
   * 디바운스된 자동 저장 (드로잉 도중 메인 스레드 멈춤 방지)
   */
  scheduleAutoSave(carId, paintCanvas, lineCanvas, delay = 600) {
    if (!carId || !paintCanvas) return;

    if (this.debounceTimers.has(carId)) {
      clearTimeout(this.debounceTimers.get(carId));
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(carId);
      await this.saveCarWork(carId, paintCanvas, lineCanvas);
    }, delay);

    this.debounceTimers.set(carId, timer);
  }

  /**
   * 자동차 도안 채색 작업 즉시 저장
   */
  async saveCarWork(carId, paintCanvas, lineCanvas) {
    if (!carId || !paintCanvas) return null;

    if (this.debounceTimers.has(carId)) {
      clearTimeout(this.debounceTimers.get(carId));
      this.debounceTimers.delete(carId);
    }

    const hasDrawing = this.hasActualDrawing(paintCanvas);

    // 채색 내용이 없으면 기존 작업 삭제
    if (!hasDrawing) {
      await this.deleteCarWork(carId);
      return null;
    }

    const fullDataUrl = paintCanvas.toDataURL('image/png');
    const thumbDataUrl = this.generateThumbnail(paintCanvas, lineCanvas);
    const updatedAt = Date.now();

    const record = {
      carId,
      fullDataUrl,
      thumbDataUrl,
      updatedAt,
      hasDrawing: true
    };

    // 1. IndexedDB 저장
    try {
      await this.dbPromise;
      if (this.db) {
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch (e) {
      console.warn('IndexedDB save failed, using LocalStorage:', e);
    }

    // 2. LocalStorage 메타데이터 캐시
    try {
      const meta = { carId, thumbDataUrl, updatedAt, hasDrawing: true };
      localStorage.setItem(`car_meta_${carId}`, JSON.stringify(meta));
      this.cachedMeta.set(carId, meta);
    } catch (e) {
      console.warn('LocalStorage meta cache failed:', e);
    }

    return record;
  }

  /**
   * 특정 도안 채색 작업 불러오기
   */
  async loadCarWork(carId) {
    if (!carId) return null;

    // 1. IndexedDB 조회
    try {
      await this.dbPromise;
      if (this.db) {
        const result = await new Promise((resolve, reject) => {
          const tx = this.db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(carId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        if (result && (result.fullDataUrl || result.thumbDataUrl)) {
          return result;
        }
      }
    } catch (e) {
      console.warn('IndexedDB load failed:', e);
    }

    // 2. LocalStorage 폴백 조회
    try {
      const legacy = localStorage.getItem(`car_art_${carId}`);
      if (legacy) {
        return {
          carId,
          fullDataUrl: legacy,
          thumbDataUrl: legacy,
          updatedAt: Date.now(),
          hasDrawing: true
        };
      }
    } catch (e) {
      // ignore
    }

    return null;
  }

  /**
   * 도안 작업 삭제 및 초기화
   */
  async deleteCarWork(carId) {
    if (!carId) return;

    this.cachedMeta.delete(carId);

    try {
      localStorage.removeItem(`car_meta_${carId}`);
      localStorage.removeItem(`car_art_${carId}`);
    } catch (e) {
      // ignore
    }

    try {
      await this.dbPromise;
      if (this.db) {
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.delete(carId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch (e) {
      console.warn('IndexedDB delete failed:', e);
    }
  }

  /**
   * 모든 도안의 저장 메타데이터 및 썸네일 조회 (갤러리 렌더용)
   */
  async getAllWorksMeta() {
    const metaMap = {};

    // 1. IndexedDB 전체 레코드 조회
    try {
      await this.dbPromise;
      if (this.db) {
        const records = await new Promise((resolve, reject) => {
          const tx = this.db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });

        records.forEach(r => {
          if (r.hasDrawing && (r.thumbDataUrl || r.fullDataUrl)) {
            metaMap[r.carId] = {
              carId: r.carId,
              thumbDataUrl: r.thumbDataUrl || r.fullDataUrl,
              updatedAt: r.updatedAt || Date.now(),
              hasDrawing: true
            };
          }
        });
      }
    } catch (e) {
      console.warn('IndexedDB getAll failed, falling back to LocalStorage:', e);
    }

    // 2. LocalStorage 보충 확인
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('car_meta_')) {
          const carId = key.replace('car_meta_', '');
          if (!metaMap[carId]) {
            try {
              const meta = JSON.parse(localStorage.getItem(key));
              if (meta && meta.hasDrawing) {
                metaMap[carId] = meta;
              }
            } catch (err) {
              // ignore
            }
          }
        } else if (key && key.startsWith('car_art_')) {
          const carId = key.replace('car_art_', '');
          if (!metaMap[carId]) {
            const dataUrl = localStorage.getItem(key);
            if (dataUrl) {
              metaMap[carId] = {
                carId,
                thumbDataUrl: dataUrl,
                updatedAt: Date.now(),
                hasDrawing: true
              };
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }

    return metaMap;
  }

  /**
   * 상대 시간 문자열 포맷터
   */
  formatRelativeTime(timestamp) {
    if (!timestamp) return '방금 전';
    const now = Date.now();
    const diff = Math.max(0, now - timestamp);

    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return '방금 전';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}분 전`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}일 전`;

    return '오래 전';
  }
}

export const storageManager = new StorageManager();
