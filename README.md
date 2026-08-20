# 🏎️ 자동차 색칠 스튜디오 (Car Coloring Studio PRO)

태블릿, 스타일러스 펜(S-Pen, Apple Pencil) 및 모바일/데스크톱 환경에 최적화된 프리미엄 자동차 색칠 웹 애플리케이션입니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-ES6+-yellow.svg)
![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-orange.svg)

---

## ✨ 주요 기능

1. **24종의 고품질 자동차 라인아트 도안**
   - 슈퍼카, 스포츠카, 세단, 특수차량, 오프로드, 중장비 등 7가지 카테고리
2. **다양한 그리기 도구**
   - **스마트 페인트통 (Flood Fill)**: 라인 경계를 인식하여 깔끔하게 채우기
   - **다양한 브러시**: 마커펜, 수채화, 에어브러시, 네온 글로우, 스파클 브러시
   - **지우개 & 브러시 굵기 5단계 프리셋 (XS ~ XL)**
   - **스타일러스 필압 감지 (S-Pen / Apple Pencil 지원)**
3. **풍부한 컬러 팔레트 & 커스텀 피커**
   - 슈퍼카, 레이싱, 파스텔, 네온, 메탈릭 테마 팔레트 및 최근 사용 색상 기록
4. **캔버스 내비게이션 & 제스처**
   - 핀치 줌 / 패닝 (화면 확대·축소 및 자유로운 이동)
   - 터치 제스처 (두 손가락 더블 탭: 실행 취소, 세 손가락 탭: 다시 실행)
5. **저장 및 내보내기**
   - 화이트/스튜디오/투명 배경 선택 후 고화질 PNG 다운로드 및 프린터 인쇄 지원

---

## 📁 프로젝트 구조

```
car_coloring/
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Pages 자동 배포 워크플로우
├── css/                      # 모듈화된 스타일시트
│   ├── main.css              # 전역 스타일 및 디자인 토큰
│   ├── toolbar.css           # 사이드바, 도구 모음, 줌 컨트롤
│   └── modal.css             # 갤러리/내보내기/도움말 모달 팝업
├── images/                   # 그래픽 및 도안 자산
│   ├── cars/                 # 자동차 도안 이미지 24종 (.jpg)
│   └── categories/           # 카테고리 SVG 아이콘 8종 (.svg)
├── js/                       # 자바스크립트 ES 모듈
│   ├── app.js                # 애플리케이션 메인 초기화 및 UI 이벤트
│   ├── audio-fx.js           # Web Audio 효과음 모듈
│   ├── brushes.js            # 브러시 엔진 및 질감 렌더링
│   ├── canvas-engine.js      # 캔버스 렌더링, 레이어, 줌/팬 관리
│   ├── cars-data.js          # 도안 메타데이터 및 카테고리 목록
│   ├── flood-fill.js         # 비트맵 기반 영역 채우기 알고리즘
│   ├── palette.js            # 팔레트 및 컬러 시스템
│   └── stickers.js           # 데칼/스티커 모듈
├── .gitignore                # Git 제외 파일 설정
├── index.html                # 메인 HTML 페이지
├── package.json              # 프로젝트 설정 및 실행 스크립트
├── README.md                 # 프로젝트 문서
└── server.js                 # 로컬 개발용 정적 웹 서버
```

---

## 🚀 실행 방법

### 1. 로컬 환경에서 실행
Node.js가 설치된 환경에서 아래 명령어로 로컬 서버를 실행할 수 있습니다:

```bash
# 서버 시작
npm start
```
브라우저에서 `http://localhost:3000`으로 접속합니다.

### 2. GitHub Pages 배포
`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`을 통해 GitHub Pages에 자동으로 배포됩니다.
