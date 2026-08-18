// 팔레트 및 색상 관리 모듈

export const THEME_PALETTES = {
  supercar: {
    name: '슈퍼카 메탈릭',
    icon: '🏎️',
    colors: [
      '#e60012', '#ff3b30', '#ff2d55', '#ff9500', '#ffcc00',
      '#34c759', '#00c7be', '#007aff', '#5856d6', '#af52de',
      '#1c1c1e', '#3a3a3c', '#8e8e93', '#d1d1d6', '#ffffff'
    ]
  },
  racing: {
    name: '레이싱 비비드',
    icon: '🏁',
    colors: [
      '#ff003c', '#ff5400', '#ffbd00', '#00f0ff', '#7000ff',
      '#39ff14', '#ffff00', '#ff007f', '#0051ff', '#00ff87',
      '#050505', '#242424', '#606060', '#e0e0e0', '#fcfcfc'
    ]
  },
  cyber: {
    name: '사이버 네온',
    icon: '⚡',
    colors: [
      '#ff007f', '#ff00ff', '#9d00ff', '#0019ff', '#00d4ff',
      '#00ffc4', '#00ff66', '#a6ff00', '#ffe600', '#ff5100',
      '#0d0221', '#0f084b', '#26408b', '#a6cfd5', '#c2e7da'
    ]
  },
  pastel: {
    name: '파스텔 소프트',
    icon: '🍬',
    colors: [
      '#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff',
      '#e8c5ff', '#ffd1dc', '#c1e1c1', '#d4f0f0', '#fce1e4',
      '#fcf4dd', '#ddedea', '#daeaf6', '#ead5e6', '#ffffff'
    ]
  },
  offroad: {
    name: '오프로드 & 어스',
    icon: '⛰️',
    colors: [
      '#3b5323', '#4b5320', '#556b2f', '#6b8e23', '#8fbc8f',
      '#8b4513', '#a0522d', '#cd853f', '#d2b48c', '#deb887',
      '#2f4f4f', '#708090', '#778899', '#bc8f8f', '#f4a460'
    ]
  },
  carparts: {
    name: '자동차 파츠 전용',
    icon: '🛞',
    colors: [
      '#121212', '#222222', '#383838', '#555555', '#7a7a7a', // 타이어, 그릴
      '#c0c0c0', '#e5e5ea', '#8ec5fc', '#e0c3fc', '#fff176', // 휠 크롬, 유리창, 틴팅, 전조등
      '#d32f2f', '#ff9800', '#29b6f6', '#4caf50', '#ffffff'  // 후미등, 방향지시등, 캘리퍼
    ]
  }
};

export class PaletteManager {
  constructor(onColorChange) {
    this.currentColor = '#ff2d55';
    this.opacity = 1.0;
    this.currentTheme = 'supercar';
    this.recentColors = this.loadRecentColors();
    this.onColorChange = onColorChange;
  }

  loadRecentColors() {
    try {
      const saved = localStorage.getItem('car_coloring_recent_colors');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load recent colors from localStorage', e);
    }
    return ['#ff2d55', '#0a84ff', '#30d158', '#ffd60a', '#bf5af2', '#ffffff', '#1c1c1e'];
  }

  saveRecentColors() {
    try {
      localStorage.setItem('car_coloring_recent_colors', JSON.stringify(this.recentColors));
    } catch (e) {
      console.warn('Failed to save recent colors to localStorage', e);
    }
  }

  setColor(hex, saveRecent = true) {
    this.currentColor = hex;
    if (saveRecent) {
      this.addRecentColor(hex);
    }
    if (this.onColorChange) {
      this.onColorChange(this.getEffectiveColor(), this.currentColor);
    }
  }

  setOpacity(val) {
    this.opacity = Math.max(0.05, Math.min(1.0, val));
    if (this.onColorChange) {
      this.onColorChange(this.getEffectiveColor(), this.currentColor);
    }
  }

  addRecentColor(hex) {
    const formatted = hex.toLowerCase();
    this.recentColors = this.recentColors.filter(c => c.toLowerCase() !== formatted);
    this.recentColors.unshift(formatted);
    if (this.recentColors.length > 14) {
      this.recentColors.pop();
    }
    this.saveRecentColors();
  }

  getEffectiveColor() {
    if (this.opacity >= 1.0) {
      return this.currentColor;
    }
    const rgb = this.hexToRgb(this.currentColor);
    if (!rgb) return this.currentColor;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.opacity})`;
  }

  hexToRgb(hex) {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length === 6) {
      const num = parseInt(clean, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }
    return null;
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
}
