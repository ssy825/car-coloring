// 메인 애플리케이션 진입점 및 컨트롤러

import { CARS_DATA, CATEGORIES } from './cars-data.js';
import { CanvasEngine } from './canvas-engine.js';
import { PaletteManager, THEME_PALETTES } from './palette.js';
import { BRUSH_TYPES, brushEngine } from './brushes.js';
import { STICKERS, stickerManager } from './stickers.js';
import { soundFx } from './audio-fx.js';

class CarColoringApp {
  constructor() {
    this.currentCarIndex = 0;
    this.init();
  }

  async init() {
    this.cacheElements();
    this.initPalette();
    this.initCanvasEngine();
    this.renderCategoryTabs();
    this.renderCarGallery();
    this.renderBrushTypes();
    this.renderStickers();
    this.bindEvents();

    // 첫 번째 차량 로드 (기본: 람보르기니)
    await this.loadCarByIndex(0);
    this.updateUI();
  }

  cacheElements() {
    this.viewport = document.getElementById('canvas-viewport');
    this.carTitle = document.getElementById('current-car-name');
    this.carCategory = document.getElementById('current-car-category');
    this.carCount = document.getElementById('current-car-count');

    // 툴 버튼들
    this.toolBtns = document.querySelectorAll('[data-tool]');
    this.brushTypeContainer = document.getElementById('brush-types-container');
    this.brushSettingsPanel = document.getElementById('brush-settings-panel');
    this.stickersPanel = document.getElementById('stickers-panel');
    this.stickersList = document.getElementById('stickers-list');

    // 슬라이더들
    this.sizeSlider = document.getElementById('brush-size-slider');
    this.sizeValue = document.getElementById('brush-size-value');
    this.opacitySlider = document.getElementById('brush-opacity-slider');
    this.opacityValue = document.getElementById('brush-opacity-value');

    // 팔레트 요소들
    this.paletteTabs = document.getElementById('palette-theme-tabs');
    this.paletteColors = document.getElementById('palette-colors-grid');
    this.recentColorsGrid = document.getElementById('recent-colors-grid');
    this.customColorInput = document.getElementById('custom-color-input');
    this.activeColorPreview = document.getElementById('active-color-preview');

    // 상단 툴바 버튼들
    this.btnUndo = document.getElementById('btn-undo');
    this.btnRedo = document.getElementById('btn-redo');
    this.btnClear = document.getElementById('btn-clear');
    this.btnCarsModal = document.getElementById('btn-cars-modal');
    this.btnExportModal = document.getElementById('btn-export-modal');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.btnSound = document.getElementById('btn-sound');

    // 줌 컨트롤
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnZoomReset = document.getElementById('btn-zoom-reset');
    this.zoomLevelText = document.getElementById('zoom-level-text');

    // 모달 및 도움말 요소
    this.carsModal = document.getElementById('cars-modal');
    this.exportModal = document.getElementById('export-modal');
    this.helpModal = document.getElementById('help-modal');
    this.btnHelp = document.getElementById('btn-help');
  }

  initPalette() {
    this.palette = new PaletteManager((effectiveColor, hexColor) => {
      if (this.canvasEngine) {
        this.canvasEngine.currentColor = hexColor;
        this.canvasEngine.brushOpacity = this.palette.opacity;
        const rgb = this.palette.hexToRgb(hexColor);
        if (rgb) {
          this.canvasEngine.currentRgb = {
            r: rgb.r,
            g: rgb.g,
            b: rgb.b,
            a: Math.floor(this.palette.opacity * 255)
          };
        }
      }
      this.activeColorPreview.style.backgroundColor = effectiveColor;
      this.customColorInput.value = hexColor;
      this.renderRecentColors();
    });

    this.renderPaletteThemes();
    this.renderThemeColors('supercar');
    this.renderRecentColors();
  }

  initCanvasEngine() {
    this.canvasEngine = new CanvasEngine(this.viewport, {
      onHistoryChange: state => {
        this.btnUndo.disabled = !state.canUndo;
        this.btnRedo.disabled = !state.canRedo;
      },
      onColorPicked: hex => {
        this.palette.setColor(hex);
        this.setTool('fill');
      },
      onZoomChange: zoomPercent => {
        this.zoomLevelText.textContent = `${zoomPercent}%`;
      }
    });

    // 초기 색상 설정
    this.palette.setColor('#ff2d55', false);
  }

  async loadCarByIndex(index) {
    if (index < 0 || index >= CARS_DATA.length) return;
    this.currentCarIndex = index;
    const car = CARS_DATA[index];

    this.carTitle.textContent = car.name;
    this.carCategory.textContent = car.categoryName;
    this.carCount.textContent = `${index + 1} / ${CARS_DATA.length}`;

    await this.canvasEngine.loadCar(car);
  }

  renderCategoryTabs() {
    const container = document.getElementById('gallery-category-tabs');
    container.innerHTML = '';

    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `cat-tab-btn ${cat.id === 'all' ? 'active' : ''}`;
      btn.textContent = cat.name;
      btn.dataset.category = cat.id;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterCarGallery(cat.id);
        soundFx.playClick();
      });
      container.appendChild(btn);
    });
  }

  renderCarGallery(filterCat = 'all') {
    const gallery = document.getElementById('cars-gallery-grid');
    gallery.innerHTML = '';

    CARS_DATA.forEach((car, idx) => {
      if (filterCat !== 'all' && car.category !== filterCat) return;

      const card = document.createElement('div');
      card.className = `car-card ${idx === this.currentCarIndex ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="car-card-img-wrap">
          <img src="${car.image}" alt="${car.name}" loading="lazy" />
          <span class="car-badge ${car.category}">${car.categoryName}</span>
        </div>
        <div class="car-card-info">
          <h4>${car.name}</h4>
          <span class="car-sub">${car.nameEn}</span>
          <p class="car-desc">${car.description}</p>
        </div>
      `;

      card.addEventListener('click', async () => {
        this.closeModal(this.carsModal);
        await this.loadCarByIndex(idx);
      });

      gallery.appendChild(card);
    });
  }

  filterCarGallery(catId) {
    this.renderCarGallery(catId);
  }

  renderBrushTypes() {
    this.brushTypeContainer.innerHTML = '';
    Object.values(BRUSH_TYPES).forEach(b => {
      if (b.id === 'eraser') return; // 지우개는 메인 툴바에서 선택
      const btn = document.createElement('button');
      btn.className = `brush-type-btn ${b.id === brushEngine.currentBrush ? 'active' : ''}`;
      btn.dataset.brushId = b.id;
      btn.innerHTML = `
        <span class="brush-icon">${b.icon}</span>
        <span class="brush-label">${b.name}</span>
      `;
      btn.title = b.desc;

      btn.addEventListener('click', () => {
        this.brushTypeContainer.querySelectorAll('.brush-type-btn').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        brushEngine.setBrush(b.id);
        this.setTool('brush');
        soundFx.playClick();
      });

      this.brushTypeContainer.appendChild(btn);
    });
  }

  renderStickers() {
    this.stickersList.innerHTML = '';
    STICKERS.forEach((st, idx) => {
      const btn = document.createElement('button');
      btn.className = `sticker-item-btn ${idx === 0 ? 'active' : ''}`;
      btn.title = st.name;

      // 미니 캔버스 프리뷰
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = 44;
      previewCanvas.height = 44;
      const ctx = previewCanvas.getContext('2d');
      stickerManager.drawSticker(ctx, st, 22, 22, 36);

      btn.appendChild(previewCanvas);
      const label = document.createElement('span');
      label.textContent = st.name;
      btn.appendChild(label);

      btn.addEventListener('click', () => {
        this.stickersList.querySelectorAll('.sticker-item-btn').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        stickerManager.selectedSticker = st;
        this.setTool('sticker');
        soundFx.playClick();
      });

      if (idx === 0) {
        stickerManager.selectedSticker = st;
      }

      this.stickersList.appendChild(btn);
    });
  }

  renderPaletteThemes() {
    this.paletteTabs.innerHTML = '';
    Object.entries(THEME_PALETTES).forEach(([key, theme], idx) => {
      const btn = document.createElement('button');
      btn.className = `palette-tab-btn ${key === this.palette.currentTheme ? 'active' : ''}`;
      btn.innerHTML = `<span>${theme.icon}</span> ${theme.name}`;
      btn.addEventListener('click', () => {
        this.paletteTabs.querySelectorAll('.palette-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.palette.currentTheme = key;
        this.renderThemeColors(key);
        soundFx.playClick();
      });
      this.paletteTabs.appendChild(btn);
    });
  }

  renderThemeColors(themeKey) {
    const theme = THEME_PALETTES[themeKey];
    if (!theme) return;
    this.paletteColors.innerHTML = '';

    theme.colors.forEach(hex => {
      const btn = document.createElement('button');
      btn.className = `color-chip ${hex.toLowerCase() === this.palette.currentColor.toLowerCase() ? 'active' : ''}`;
      btn.style.backgroundColor = hex;
      btn.dataset.color = hex;
      btn.title = hex;

      btn.addEventListener('click', () => {
        this.palette.setColor(hex);
        this.paletteColors.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        soundFx.playPop();
      });

      this.paletteColors.appendChild(btn);
    });
  }

  renderRecentColors() {
    this.recentColorsGrid.innerHTML = '';
    this.palette.recentColors.forEach(hex => {
      const btn = document.createElement('button');
      btn.className = `recent-color-chip ${hex.toLowerCase() === this.palette.currentColor.toLowerCase() ? 'active' : ''}`;
      btn.style.backgroundColor = hex;
      btn.dataset.color = hex;

      btn.addEventListener('click', () => {
        this.palette.setColor(hex, false);
        soundFx.playClick();
      });

      this.recentColorsGrid.appendChild(btn);
    });
  }

  setTool(toolName) {
    this.canvasEngine.currentTool = toolName;

    this.toolBtns.forEach(btn => {
      if (btn.dataset.tool === toolName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 브러시 설정 패널 노출 여부 및 상태 동기화
    if (toolName === 'brush') {
      this.brushSettingsPanel.classList.remove('hidden');
      if (!BRUSH_TYPES[brushEngine.currentBrush]) {
        brushEngine.setBrush('pen');
      }
      if (this.brushTypeContainer) {
        this.brushTypeContainer.querySelectorAll('.brush-type-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.brushId === brushEngine.currentBrush);
        });
      }
    } else if (toolName === 'eraser') {
      this.brushSettingsPanel.classList.remove('hidden');
    } else {
      this.brushSettingsPanel.classList.add('hidden');
    }

    // 스티커 패널 노출 여부
    if (toolName === 'sticker') {
      this.stickersPanel.classList.remove('hidden');
    } else {
      this.stickersPanel.classList.add('hidden');
    }

    // 커서 스타일
    if (toolName === 'fill') {
      this.viewport.style.cursor = 'crosshair';
    } else if (toolName === 'eyedropper') {
      this.viewport.style.cursor = 'copy';
    } else if (toolName === 'sticker') {
      this.viewport.style.cursor = 'cell';
    } else {
      this.viewport.style.cursor = 'default';
    }
  }

  bindEvents() {
    // 툴바 도구 선택
    this.toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this.setTool(tool);
        soundFx.playClick();
      });
    });

    // 브러시 크기 슬라이더
    this.sizeSlider.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      this.sizeValue.textContent = `${val}px`;
      this.canvasEngine.brushSize = val;
    });

    // 불투명도 슬라이더
    this.opacitySlider.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      this.opacityValue.textContent = `${val}%`;
      this.palette.setOpacity(val / 100);
    });

    // 커스텀 컬러 인풋 (HTML5 color)
    this.customColorInput.addEventListener('input', e => {
      this.palette.setColor(e.target.value);
    });

    // Undo / Redo / Clear
    this.btnUndo.addEventListener('click', () => {
      this.canvasEngine.undo();
      soundFx.playUndo();
    });

    this.btnRedo.addEventListener('click', () => {
      this.canvasEngine.redo();
      soundFx.playPop();
    });

    this.btnClear.addEventListener('click', () => {
      if (confirm('현재 색칠한 내용을 모두 지우고 초기화하시겠습니까?')) {
        this.canvasEngine.clearPaint();
      }
    });

    // 줌 버튼들
    this.btnZoomIn.addEventListener('click', () => {
      this.canvasEngine.setZoom(this.canvasEngine.scale * 1.25);
      soundFx.playClick();
    });

    this.btnZoomOut.addEventListener('click', () => {
      this.canvasEngine.setZoom(this.canvasEngine.scale * 0.8);
      soundFx.playClick();
    });

    this.btnZoomReset.addEventListener('click', () => {
      this.canvasEngine.resetZoom();
      soundFx.playClick();
    });

    // 차량 선택 이전/다음 버튼
    document.getElementById('btn-prev-car').addEventListener('click', () => {
      let nextIdx = this.currentCarIndex - 1;
      if (nextIdx < 0) nextIdx = CARS_DATA.length - 1;
      this.loadCarByIndex(nextIdx);
    });

    document.getElementById('btn-next-car').addEventListener('click', () => {
      let nextIdx = this.currentCarIndex + 1;
      if (nextIdx >= CARS_DATA.length) nextIdx = 0;
      this.loadCarByIndex(nextIdx);
    });

    // 전체화면 토글
    this.btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Fullscreen request failed:', err);
        });
        this.btnFullscreen.innerHTML = '<span>⤓</span>';
      } else {
        document.exitFullscreen();
        this.btnFullscreen.innerHTML = '<span>⛶</span>';
      }
    });

    // 사운드 토글
    this.btnSound.addEventListener('click', () => {
      const enabled = soundFx.toggle();
      this.btnSound.classList.toggle('muted', !enabled);
      this.btnSound.innerHTML = enabled ? '<span>🔊</span>' : '<span>🔇</span>';
    });

    // 모달 열기/닫기
    this.btnCarsModal.addEventListener('click', () => this.openModal(this.carsModal));
    this.btnExportModal.addEventListener('click', () => this.openExportModal());
    this.btnHelp.addEventListener('click', () => this.openModal(this.helpModal));

    document.querySelectorAll('.modal-close-btn, .modal-backdrop').forEach(btn => {
      btn.addEventListener('click', e => {
        const modal = e.target.closest('.modal-container');
        if (modal) this.closeModal(modal);
      });
    });

    // 저장/다운로드 버튼
    document.getElementById('btn-download-png').addEventListener('click', () => {
      const bgType = document.querySelector('input[name="export-bg"]:checked').value;
      this.canvasEngine.downloadImage(null, bgType);
      this.closeModal(this.exportModal);
    });

    document.getElementById('btn-print-art').addEventListener('click', () => {
      this.canvasEngine.printArtwork();
      this.closeModal(this.exportModal);
    });

    // 키보드 단축키
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.canvasEngine.redo();
        } else {
          this.canvasEngine.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.canvasEngine.redo();
      } else if (e.key.toLowerCase() === 'b') {
        this.setTool('brush');
      } else if (e.key.toLowerCase() === 'f') {
        this.setTool('fill');
      } else if (e.key.toLowerCase() === 'e') {
        this.setTool('eraser');
      } else if (e.key.toLowerCase() === 'i') {
        this.setTool('eyedropper');
      }
    });
  }

  openModal(modal) {
    modal.classList.add('active');
    soundFx.playClick();
  }

  closeModal(modal) {
    modal.classList.remove('active');
    soundFx.playClick();
  }

  openExportModal() {
    const previewImg = document.getElementById('export-preview-image');
    previewImg.src = this.canvasEngine.exportMergedImage('white');
    this.openModal(this.exportModal);
  }

  updateUI() {
    this.setTool('brush');
  }
}

// DOM 준비 시 앱 초기화
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CarColoringApp();
});
