/**
 * 자동차 도안 갤러리 컨트롤러 (GalleryController)
 * 도안 카테고리 탭, 갤러리 그리드 카드, '작업 중' 필터 및 썸네일 렌더링을 전담합니다.
 */

import { CARS_DATA, CATEGORIES } from './cars-data.js';
import { storageManager } from './storage.js';

export class GalleryController {
  constructor(options = {}) {
    this.currentCategory = 'all';
    this.currentCarIndex = 0;
    this.allWorksMeta = {};

    this.categoryTabsContainer = options.categoryTabsContainer;
    this.galleryContainer = options.galleryContainer;

    this.onSelectCar = options.onSelectCar || null;
    this.onDeleteWork = options.onDeleteWork || null;
  }

  /**
   * 저장소 메타데이터 갱신
   */
  async refreshMeta() {
    this.allWorksMeta = await storageManager.getAllWorksMeta();
  }

  /**
   * 카테고리 탭 UI 렌더링
   */
  async renderCategoryTabs() {
    if (!this.categoryTabsContainer) return;
    this.categoryTabsContainer.innerHTML = '';

    await this.refreshMeta();
    const inProgressCount = Object.keys(this.allWorksMeta).filter(id => this.allWorksMeta[id]?.hasDrawing).length;

    const tabList = [];
    if (inProgressCount > 0) {
      tabList.push({
        id: 'in_progress',
        name: '작업 중',
        icon: '🎨',
        count: inProgressCount,
        isSpecial: true
      });
    }

    CATEGORIES.forEach(cat => {
      tabList.push({
        ...cat,
        count: cat.id === 'all' ? CARS_DATA.length : CARS_DATA.filter(c => c.category === cat.id).length
      });
    });

    if (this.currentCategory === 'in_progress' && inProgressCount === 0) {
      this.currentCategory = 'all';
    }

    tabList.forEach(cat => {
      const btn = document.createElement('button');
      const isActive = cat.id === this.currentCategory;
      btn.className = `cat-tab-btn ${isActive ? 'active' : ''}`;
      btn.dataset.category = cat.id;

      if (cat.isSpecial) {
        btn.innerHTML = `
          <span class="cat-tab-icon" style="font-size: 1.1rem; line-height: 1;">${cat.icon}</span>
          <span class="cat-tab-name">${cat.name}</span>
          <span class="cat-tab-badge">${cat.count}</span>
        `;
      } else {
        btn.innerHTML = `
          <span class="cat-tab-img-wrap">
            <img src="${cat.image}" alt="${cat.name}" loading="lazy" />
          </span>
          <span class="cat-tab-name">${cat.name}</span>
        `;
      }

      btn.addEventListener('click', async () => {
        this.categoryTabsContainer.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = cat.id;
        await this.renderGallery(cat.id);
      });

      this.categoryTabsContainer.appendChild(btn);
    });
  }

  /**
   * 자동차 도안 갤러리 카드 렌더링
   */
  async renderGallery(category = this.currentCategory) {
    this.currentCategory = category;
    if (!this.galleryContainer) return;
    this.galleryContainer.innerHTML = '';

    await this.refreshMeta();

    let filteredCars = [];
    if (category === 'in_progress') {
      filteredCars = CARS_DATA.filter(car => this.allWorksMeta[car.id]?.hasDrawing);
    } else if (category !== 'all') {
      filteredCars = CARS_DATA.filter(car => car.category === category);
    } else {
      filteredCars = CARS_DATA;
    }

    if (category === 'in_progress' && filteredCars.length === 0) {
      this.galleryContainer.innerHTML = `
        <div class="gallery-empty-state">
          <span class="empty-icon">🎨</span>
          <h4>현재 색칠 중인 도안이 없습니다</h4>
          <p>원하는 자동차 도안을 골라 채색을 시작해보세요.<br>작업 중인 도안은 언제든 이곳에 자동으로 안전하게 보관됩니다.</p>
        </div>
      `;
      return;
    }

    filteredCars.forEach(car => {
      const originalIdx = CARS_DATA.findIndex(c => c.id === car.id);
      const meta = this.allWorksMeta[car.id];
      const isInProgress = !!(meta && meta.hasDrawing);
      const displayImage = isInProgress && meta.thumbDataUrl ? meta.thumbDataUrl : car.image;
      const isCurrentCar = originalIdx === this.currentCarIndex;

      const card = document.createElement('div');
      card.className = `car-card ${isCurrentCar ? 'selected' : ''} ${isInProgress ? 'in-progress' : ''}`;
      card.innerHTML = `
        <div class="car-card-img-wrap">
          <img src="${displayImage}" alt="${car.name}" loading="lazy" />
          ${isInProgress ? `
            <div class="in-progress-badge" title="최근 수정: ${storageManager.formatRelativeTime(meta.updatedAt)}">
              <span class="pulse-dot"></span>
              <span class="badge-text">색칠 중</span>
              <span class="time-text">${storageManager.formatRelativeTime(meta.updatedAt)}</span>
            </div>
          ` : ''}
          <span class="car-badge ${car.category}">${car.categoryName}</span>
          ${isInProgress ? `
            <div class="card-hover-actions">
              <button class="card-action-btn resume" data-index="${originalIdx}">
                <span>▶</span> <span>이어 그리기</span>
              </button>
              <button class="card-action-btn delete" data-car-id="${car.id}" data-car-name="${car.name}" title="작업 삭제 및 초기화">
                <span>🗑️</span>
              </button>
            </div>
          ` : ''}
        </div>
        <div class="car-card-info">
          <h4>${car.name}</h4>
          <span class="car-sub">${car.nameEn}</span>
          <p class="car-desc">${car.description}</p>
        </div>
      `;

      // 카드 클릭 시 차량 선택
      card.addEventListener('click', async e => {
        if (e.target.closest('.card-action-btn.delete')) return;
        if (this.onSelectCar) {
          await this.onSelectCar(originalIdx);
        }
      });

      // 삭제 버튼 클릭 이벤트
      const deleteBtn = card.querySelector('.card-action-btn.delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async e => {
          e.stopPropagation();
          const carName = deleteBtn.dataset.carName;
          const carId = deleteBtn.dataset.carId;
          if (confirm(`'${carName}' 도안의 채색 내용을 삭제하고 초기화하시겠습니까?`)) {
            if (this.onDeleteWork) {
              await this.onDeleteWork(carId, originalIdx);
            }
            await this.renderCategoryTabs();
            await this.renderGallery(this.currentCategory);
          }
        });
      }

      this.galleryContainer.appendChild(card);
    });
  }

  setCurrentIndex(index) {
    this.currentCarIndex = index;
  }
}
