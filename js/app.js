/**
 * 자동차 색칠 스튜디오 메인 애플리케이션 (CarColoringApp)
 * UI 컨트롤러, 캔버스 엔진, 팔레트 및 갤러리/모달 시스템을 배선하고 초기화합니다.
 */

import { CARS_DATA } from './cars-data.js';
import { CanvasEngine } from './canvas-engine.js';
import { PaletteManager, THEME_PALETTES } from './palette.js';
import { BRUSH_TYPES, brushEngine } from './brushes.js';
import { modalManager } from './modal.js';
import { GalleryController } from './gallery.js';
import { soundFx } from './audio-fx.js';

const BRUSH_SIZE_CONFIG = {
  '4': { label: 'XS (4px)', size: 4 },
  '10': { label: 'S (10px)', size: 10 },
  '18': { label: 'M (18px)', size: 18 },
  '32': { label: 'L (32px)', size: 32 },
  '56': { label: 'XL (56px)', size: 56 }
};

class CarColoringApp {
  constructor() {
    this.currentCarIndex = 0;
    this.init();
  }

  async init() {
    this.cacheElements();
    this.initPalette();
    this.initCanvasEngine();
    this.initGallery();
    this.renderBrushTypes();
    this.bindEvents();

    // 첫 번째 도안 로드
    await this.loadCarByIndex(0);
    this.updateUI();
  }

  cacheElements() {
    this.viewport = document.getElementById('canvas-viewport');
    this.sidebar = document.getElementById('left-sidebar');
    this.btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    this.carTitle = document.getElementById('current-car-name');
    this.carCount = document.getElementById('current-car-count');

    // 툴 버튼 및 패널
    this.toolBtns = document.querySelectorAll('[data-tool]');
    this.brushStylePanel = document.getElementById('brush-style-panel');
    this.brushSizePanel = document.getElementById('brush-size-panel');
    this.brushTypeContainer = document.getElementById('brush-types-container');
    this.brushSizePresetBtns = document.querySelectorAll('.size-preset-btn');
    this.currentSizeBadge = document.getElementById('current-size-badge');

    // 팔레트 요소
    this.paletteTabs = document.getElementById('palette-theme-tabs');
    this.paletteColors = document.getElementById('palette-colors-grid');
    this.recentColorsGrid = document.getElementById('recent-colors-grid');
    this.customColorInput = document.getElementById('custom-color-input');
    this.activeColorPreview = document.getElementById('active-color-preview');

    // 상단 툴바 버튼
    this.btnUndo = document.getElementById('btn-undo');
    this.btnRedo = document.getElementById('btn-redo');
    this.btnClear = document.getElementById('btn-clear');
    this.btnCarsModal = document.getElementById('btn-cars-modal');
    this.btnExportModal = document.getElementById('btn-export-modal');
    this.btnFullscreen = document.getElementById('btn-fullscreen');

    // 줌 컨트롤
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnZoomReset = document.getElementById('btn-zoom-reset');
    this.zoomLevelText = document.getElementById('zoom-level-text');

    // 모달 요소
    this.carsModal = document.getElementById('cars-modal');
    this.exportModal = document.getElementById('export-modal');
    this.helpModal = document.getElementById('help-modal');
    this.btnHelp = document.getElementById('btn-help');
  }

  initPalette() {
    this.palette = new PaletteManager((effectiveColor, hexColor) => {
      if (this.canvasEngine) {
        this.canvasEngine.currentColor = hexColor;
        this.canvasEngine.brushOpacity = 1.0;
        const rgb = this.palette.hexToRgb(hexColor);
        if (rgb) {
          this.canvasEngine.currentRgb = {
            r: rgb.r,
            g: rgb.g,
            b: rgb.b,
            a: 255
          };
        }
      }
      this.activeColorPreview.style.backgroundColor = effectiveColor;
      this.customColorInput.value = hexColor;
      this.updateThemeColorsActiveState();
      this.updateRecentColorsActiveState();
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
      onZoomChange: zoomPercent => {
        this.zoomLevelText.textContent = `${zoomPercent}%`;
      }
    });

    // 기본 색상 설정
    this.palette.setColor('#ff2d55', false);
  }

  initGallery() {
    this.galleryController = new GalleryController({
      categoryTabsContainer: document.getElementById('gallery-category-tabs'),
      galleryContainer: document.getElementById('cars-gallery-grid'),
      onSelectCar: async carIndex => {
        modalManager.close(this.carsModal);
        await this.loadCarByIndex(carIndex);
      },
      onDeleteWork: async (carId, originalIdx) => {
        if (this.currentCarIndex === originalIdx && this.canvasEngine) {
          this.canvasEngine.paintCtx.clearRect(0, 0, this.canvasEngine.width, this.canvasEngine.height);
          this.canvasEngine.historyManager.clear();
          this.canvasEngine.historyManager.saveSnapshot(this.canvasEngine.paintCtx, this.canvasEngine.width, this.canvasEngine.height);
        }
      }
    });
  }

  async loadCarByIndex(index) {
    if (index < 0 || index >= CARS_DATA.length) return;
    if (this.canvasEngine) {
      await this.canvasEngine.flushSave();
    }

    this.currentCarIndex = index;
    const car = CARS_DATA[index];

    this.carTitle.textContent = car.name;
    this.carCount.textContent = `${index + 1} / ${CARS_DATA.length}`;

    if (this.galleryController) {
      this.galleryController.setCurrentIndex(index);
    }

    await this.canvasEngine.loadCar(car);
  }

  renderBrushTypes() {
    this.brushTypeContainer.innerHTML = '';
    Object.values(BRUSH_TYPES).forEach(b => {
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

  renderPaletteThemes() {
    this.paletteTabs.innerHTML = '';
    Object.entries(THEME_PALETTES).forEach(([key, theme]) => {
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
        this.palette.setColor(hex, true);
        this.renderRecentColors();
        soundFx.playPop();
      });

      this.paletteColors.appendChild(btn);
    });
  }

  updateThemeColorsActiveState() {
    const currentHex = this.palette.currentColor.toLowerCase();
    this.paletteColors.querySelectorAll('.color-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.color && c.dataset.color.toLowerCase() === currentHex);
    });
  }

  renderRecentColors() {
    this.recentColorsGrid.innerHTML = '';
    this.palette.recentColors.forEach(hex => {
      const btn = document.createElement('button');
      btn.className = `recent-color-chip ${hex.toLowerCase() === this.palette.currentColor.toLowerCase() ? 'active' : ''}`;
      btn.style.backgroundColor = hex;
      btn.dataset.color = hex;
      btn.title = hex;

      btn.addEventListener('click', () => {
        this.palette.setColor(hex, false);
        soundFx.playPop();
      });

      this.recentColorsGrid.appendChild(btn);
    });
  }

  updateRecentColorsActiveState() {
    const currentHex = this.palette.currentColor.toLowerCase();
    this.recentColorsGrid.querySelectorAll('.recent-color-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color && btn.dataset.color.toLowerCase() === currentHex);
    });
  }

  setBrushSizePreset(sizeNumber) {
    const size = parseInt(sizeNumber, 10);
    this.canvasEngine.brushSize = size;
    brushEngine.setSize(size);

    this.brushSizePresetBtns.forEach(btn => {
      const btnSize = parseInt(btn.dataset.size, 10);
      btn.classList.toggle('active', btnSize === size);
    });

    const info = BRUSH_SIZE_CONFIG[size] || { label: `${size}px` };
    if (this.currentSizeBadge) {
      this.currentSizeBadge.textContent = info.label;
    }
  }

  setTool(toolName) {
    this.canvasEngine.currentTool = toolName;

    this.toolBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });

    // 도구별 패널 표시 여부
    if (toolName === 'brush') {
      this.brushStylePanel.classList.remove('hidden');
      this.brushSizePanel.classList.remove('hidden');
      if (!BRUSH_TYPES[brushEngine.currentBrush]) {
        brushEngine.setBrush('pen');
      }
      if (this.brushTypeContainer) {
        this.brushTypeContainer.querySelectorAll('.brush-type-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.brushId === brushEngine.currentBrush);
        });
      }
    } else if (toolName === 'eraser') {
      this.brushStylePanel.classList.add('hidden');
      this.brushSizePanel.classList.remove('hidden');
    } else {
      // fill
      this.brushStylePanel.classList.add('hidden');
      this.brushSizePanel.classList.add('hidden');
    }

    if (toolName === 'fill') {
      this.viewport.style.cursor = 'crosshair';
    } else {
      this.viewport.style.cursor = 'default';
    }
  }

  toggleSidebar() {
    const isCollapsed = this.sidebar.classList.toggle('collapsed');
    this.btnToggleSidebar.classList.toggle('active', !isCollapsed);

    setTimeout(() => {
      if (this.canvasEngine) {
        this.canvasEngine.fitCanvasToContainer();
      }
    }, 320);
  }

  bindEvents() {
    // 사이드바 토글
    this.btnToggleSidebar.addEventListener('click', () => {
      this.toggleSidebar();
      soundFx.playClick();
    });

    // 메인 도구 전환
    this.toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTool(btn.dataset.tool);
        soundFx.playClick();
      });
    });

    // 브러시 굵기 프리셋
    this.brushSizePresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setBrushSizePreset(btn.dataset.size);
        soundFx.playClick();
      });
    });

    // 커스텀 컬러 입력
    this.customColorInput.addEventListener('input', e => {
      this.palette.setColor(e.target.value, false);
    });

    this.customColorInput.addEventListener('change', e => {
      this.palette.setColor(e.target.value, true);
      this.renderRecentColors();
    });

    // Undo / Redo / Clear
    this.btnUndo.addEventListener('click', () => {
      this.canvasEngine.undo();
    });

    this.btnRedo.addEventListener('click', () => {
      this.canvasEngine.redo();
    });

    this.btnClear.addEventListener('click', () => {
      if (confirm('현재 색칠한 내용을 모두 지우고 초기화하시겠습니까?')) {
        this.canvasEngine.clearPaint();
        soundFx.playUndo();
      }
    });

    // 줌 컨트롤
    this.btnZoomIn.addEventListener('click', () => {
      this.canvasEngine.setZoom(this.canvasEngine.scale * 1.25);
    });

    this.btnZoomOut.addEventListener('click', () => {
      this.canvasEngine.setZoom(this.canvasEngine.scale * 0.8);
    });

    this.btnZoomReset.addEventListener('click', () => {
      this.canvasEngine.resetZoom();
      soundFx.playClick();
    });

    // 이전/다음 자동차 도안 내비게이션
    document.getElementById('btn-prev-car').addEventListener('click', async () => {
      let nextIdx = this.currentCarIndex - 1;
      if (nextIdx < 0) nextIdx = CARS_DATA.length - 1;
      await this.loadCarByIndex(nextIdx);
      soundFx.playClick();
    });

    document.getElementById('btn-next-car').addEventListener('click', async () => {
      let nextIdx = this.currentCarIndex + 1;
      if (nextIdx >= CARS_DATA.length) nextIdx = 0;
      await this.loadCarByIndex(nextIdx);
      soundFx.playClick();
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

    // 모달 열기
    this.btnCarsModal.addEventListener('click', async () => {
      if (this.canvasEngine) {
        await this.canvasEngine.flushSave();
      }
      await this.galleryController.renderCategoryTabs();
      await this.galleryController.renderGallery();
      modalManager.open(this.carsModal);
    });

    this.btnExportModal.addEventListener('click', () => {
      const previewImg = document.getElementById('export-preview-image');
      previewImg.src = this.canvasEngine.exportMergedImage('white');
      modalManager.open(this.exportModal);
    });

    this.btnHelp.addEventListener('click', () => {
      modalManager.open(this.helpModal);
    });

    // 내보내기 다운로드 & 인쇄
    document.getElementById('btn-download-png').addEventListener('click', () => {
      const bgType = document.querySelector('input[name="export-bg"]:checked').value;
      this.canvasEngine.downloadImage(null, bgType);
      modalManager.close(this.exportModal);
    });

    document.getElementById('btn-print-art').addEventListener('click', () => {
      this.canvasEngine.printArtwork();
      modalManager.close(this.exportModal);
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
      } else if (e.key.toLowerCase() === 't') {
        this.toggleSidebar();
      }
    });
  }

  updateUI() {
    this.setTool('brush');
    this.setBrushSizePreset(18);
  }
}

// DOM 준비 시 앱 초기화
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CarColoringApp();
});
