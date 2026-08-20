// 메인 애플리케이션 진입점 및 컨트롤러

import { CARS_DATA, CATEGORIES } from './cars-data.js';
import { CanvasEngine } from './canvas-engine.js';
import { PaletteManager, THEME_PALETTES } from './palette.js';
import { BRUSH_TYPES, brushEngine } from './brushes.js';

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
    this.renderCategoryTabs();
    this.renderCarGallery();
    this.renderBrushTypes();
    this.bindEvents();

    // 첫 번째 차량 로드 (기본: 람보르기니)
    await this.loadCarByIndex(0);
    this.updateUI();
  }

  cacheElements() {
    this.viewport = document.getElementById('canvas-viewport');
    this.sidebar = document.getElementById('left-sidebar');
    this.btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    this.carTitle = document.getElementById('current-car-name');
    this.carCategory = document.getElementById('current-car-category');
    this.carCount = document.getElementById('current-car-count');

    // 툴 버튼들 & 패널
    this.toolBtns = document.querySelectorAll('[data-tool]');
    this.brushStylePanel = document.getElementById('brush-style-panel');
    this.brushSizePanel = document.getElementById('brush-size-panel');
    this.brushTypeContainer = document.getElementById('brush-types-container');
    this.brushSizePresetBtns = document.querySelectorAll('.size-preset-btn');
    this.currentSizeBadge = document.getElementById('current-size-badge');

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
      btn.dataset.category = cat.id;
      btn.innerHTML = `
        <span class="cat-tab-img-wrap">
          <img src="${cat.image}" alt="${cat.name}" loading="lazy" />
        </span>
        <span class="cat-tab-name">${cat.name}</span>
      `;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterCarGallery(cat.id);
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
      if (b.id === 'eraser') return; // 지우개는 메인 툴에서 독립 제공
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

    // 패널 가시성 제어
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
      // fill 모드
      this.brushStylePanel.classList.add('hidden');
      this.brushSizePanel.classList.add('hidden');
    }

    // 커서 스타일
    if (toolName === 'fill') {
      this.viewport.style.cursor = 'crosshair';
    } else {
      this.viewport.style.cursor = 'default';
    }
  }

  toggleSidebar() {
    const isCollapsed = this.sidebar.classList.toggle('collapsed');
    this.btnToggleSidebar.classList.toggle('active', !isCollapsed);

    // 사이드바 트랜지션 완료 후 캔버스 리사이즈
    setTimeout(() => {
      if (this.canvasEngine) {
        this.canvasEngine.fitCanvasToContainer();
      }
    }, 320);
  }

  bindEvents() {
    // 사이드바 토글 버튼
    this.btnToggleSidebar.addEventListener('click', () => {
      this.toggleSidebar();
    });

    // 메인 도구 선택 (페인트, 브러시, 지우개)
    this.toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this.setTool(tool);
      });
    });

    // 브러시 굵기 5종 프리셋 버튼
    this.brushSizePresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setBrushSizePreset(btn.dataset.size);
      });
    });

    // 커스텀 컬러 인풋: 실시간 드래그 시에는 색상과 프리뷰만 적용 (최근 색상 목록 유지)
    this.customColorInput.addEventListener('input', e => {
      this.palette.setColor(e.target.value, false);
    });

    // 커스텀 컬러 선택 완료 시(창 닫기/확정 시)에만 최근 사용한 색상에 1회 추가
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
      }
    });

    // 줌 버튼들
    this.btnZoomIn.addEventListener('click', () => {
      this.canvasEngine.setZoom(this.canvasEngine.scale * 1.25);
    });

    this.btnZoomOut.addEventListener('click', () => {
      this.canvasEngine.setZoom(this.canvasEngine.scale * 0.8);
    });

    this.btnZoomReset.addEventListener('click', () => {
      this.canvasEngine.resetZoom();
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
      } else if (e.key.toLowerCase() === 't') {
        this.toggleSidebar();
      }
    });
  }

  openModal(modal) {
    modal.classList.add('active');
  }

  closeModal(modal) {
    modal.classList.remove('active');
  }

  openExportModal() {
    const previewImg = document.getElementById('export-preview-image');
    previewImg.src = this.canvasEngine.exportMergedImage('white');
    this.openModal(this.exportModal);
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
