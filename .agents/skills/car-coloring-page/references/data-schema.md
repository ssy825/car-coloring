# 자동차 도안 메타데이터 규격 (Data Schema Reference)

`js/cars-data.js`의 `CARS_DATA` 및 `CATEGORIES`에 새로운 도안을 등록할 때 준수해야 하는 스키마 및 가이드라인입니다.

---

## 📌 `CARS_DATA` 아이템 스키마

```javascript
{
  id: 'genesis_g80',                    // [필수] 고유 식별자 (snake_case, 소문자)
  name: '제네시스 G80',                  // [필수] 한글 차량명 (세대/모델명 포함)
  nameEn: 'Genesis G80 Luxury Sedan',   // [필수] 영문 차량명
  category: 'sedan',                    // [필수] 카테고리 ID (아래 7대 분류 중 1개)
  categoryName: '승용차',               // [필수] 카테고리 표시명 (카테고리와 1:1 매핑)
  difficulty: '보통',                   // [필수] 채색 난이도 ('쉬움', '보통', '어려움 (정밀)')
  description: '아이코닉한 크레스트 그릴과 쿼드램프를 갖춘 럭셔리 프리미엄 세단', // [필수] 1~2줄 차량 소개
  image: 'images/cars/sedan/genesis_g80.jpg', // [필수] 도안 이미지 상대 경로 (16:9 규격)
  defaultColor: '#1c1c1e',              // [필수] 대표 추천 바디 컬러 (HEX 코드)
  accentColor: '#5e5ce6'                // [필수] 대표 포인트/캘리퍼/램프 컬러 (HEX 코드)
}
```

---

## 🏷️ 7대 카테고리 매핑표

| 카테고리 `id` | 카테고리 `categoryName` | 저장 폴더 경로 | 카테고리 아이콘 SVG | 대표 차종 예시 |
| :--- | :--- | :--- | :--- | :--- |
| `sedan` | `승용차` | `images/cars/sedan/` | `images/categories/cat_sedan.svg` | 아반떼, 그랜저, 쏘나타, G80, 5시리즈, 모델 3, 비틀, 미니쿠퍼 |
| `suv_mpv` | `SUV/CUV/MPV` | `images/cars/suv_mpv/` | `images/categories/cat_suv.svg` | GV80, 싼타페, 팰리세이드, 카니발, 지프, G바겐, 레인지로버, 사이버트럭 |
| `sports` | `스포츠카/고성능` | `images/cars/sports/` | `images/categories/cat_sports.svg` | 포르쉐 911, 람보르기니 SVJ, 페라리, 머스탱 GT, AMG GT, F1 레이스카 |
| `truck` | `화물차` | `images/cars/truck/` | `images/categories/cat_truck.svg` | 1톤 카고 트럭(포터), 1톤 냉동 탑차, 대형 세미 트레일러 트럭 |
| `bus` | `승합차/버스` | `images/cars/bus/` | `images/categories/cat_bus.svg` | 클래식 스쿨버스, 시내 저상버스, 관광 리무진 버스 |
| `special` | `특수목적차` | `images/cars/special/` | `images/categories/cat_special.svg` | 경찰차, 119 구급차, 소방차, 굴착기, 농업용 트랙터, 레미콘 믹서트럭 |
| `micro` | `이륜/소형 이동수단` | `images/cars/micro/` | `images/categories/cat_micro.svg` | 클래식 스쿠터, 전기 킥보드, 슈퍼바이크 |

---

## 🎯 난이도 (Difficulty) 산정 기준

- **`쉬움`**: 외곽선이 굵고 단순하며 칠할 영역(바디 패널)이 큼직한 차량 (예: 스쿨버스, 사이버트럭, 머스탱, 비틀, 일반 포터)
- **`보통`**: 일반적인 디테일의 양산 승용차 및 SUV (예: 그랜저, 쏘나타, GV80, 싼타페, 5시리즈, 카니발)
- **`어려움 (정밀)`**: 에어로 파츠, 유압 실린더, 무한궤도, 복잡한 그릴 메쉬 등 정밀한 영역 분할이 필요한 차량 (예: 람보르기니 SVJ, F1 레이스카, 중장비 굴착기, 레미콘 믹서트럭)

---

## 🎨 기본/포인트 컬러 (`defaultColor`, `accentColor`) 추천 가이드

사용자가 도안을 처음 불러왔을 때 팔레트에서 직관적으로 어울리는 추천 색상을 제공하기 위한 컬러값입니다:

| 차량 테마 | `defaultColor` | `accentColor` | 설명 |
| :--- | :--- | :--- | :--- |
| **다크/미드나잇 럭셔리** | `#1c1c1e` | `#5e5ce6` | 블랙 바디 & 퍼플/블루 앰비언트 |
| **이탈리안 슈퍼 레드** | `#ff2d55` | `#ffe600` | 강렬한 레드 바디 & 옐로우 브레이크 캘리퍼 |
| **레이싱 애시드 그린** | `#30d158` | `#0a84ff` | GT3 감성의 비비드 그린 & 스카이블루 포인트 |
| **클래식 일렉트릭 블루** | `#0a84ff` | `#ffffff` | 선명한 블루 & 화이트 스트라이프 |
| **퓨어 펄 화이트** | `#ffffff` | `#ff3b30` | 화이트 바디 & 레드 리어램프 포인트 |
| **메탈릭 실버/크롬** | `#c0c0c0` | `#ff9f0a` | 럭셔리 실버 바디 & 오렌지 턴시그널 포인트 |
| **건설/중장비 옐로우/오렌지**| `#ff9f0a` | `#1c1c1e` | 중장비 시그니처 오렌지/옐로우 & 블랙 하부 |
| **사이버 퓨처 테크** | `#a1a8b8` | `#00f0ff` | 메탈릭 무광 그레이 & 네온 사이버 시안 |
