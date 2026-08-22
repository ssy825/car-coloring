#!/usr/bin/env node
/**
 * register-car.js
 * 새 자동차 도안 메타데이터를 js/cars-data.js에 등록/업데이트하는 도구 (ES Module)
 * 
 * 사용법:
 * node .agents/skills/car-coloring-page/scripts/register-car.js \
 *   --id ioniq5 \
 *   --name "현대 아이오닉 5" \
 *   --nameEn "Hyundai Ioniq 5 EV" \
 *   --category sedan \
 *   --difficulty "보통" \
 *   --desc "파라메트릭 픽셀 라이트와 미래지향적 실루엣의 전기 CUV" \
 *   --image "images/cars/sedan/ioniq5.jpg" \
 *   --defaultColor "#00f0ff" \
 *   --accentColor "#1c1c1e"
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARS_DATA, CATEGORIES } from '../../../../js/cars-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../../../');
const CARS_DATA_PATH = path.join(ROOT_DIR, 'js/cars-data.js');

const CATEGORY_MAP = {
  sedan: '승용차',
  suv_mpv: 'SUV/CUV/MPV',
  sports: '스포츠카/고성능',
  truck: '화물차',
  bus: '승합차/버스',
  special: '특수목적차',
  micro: '이륜/소형 이동수단'
};

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      params[key] = val;
    }
  }
  return params;
}

function registerCar(carData) {
  // 필수 필드 검증
  const required = ['id', 'name', 'nameEn', 'category', 'difficulty', 'description', 'image', 'defaultColor', 'accentColor'];
  for (const field of required) {
    if (!carData[field]) {
      throw new Error(`필수 필드 누락: --${field}`);
    }
  }

  // 카테고리 검증
  if (!CATEGORY_MAP[carData.category]) {
    throw new Error(`유효하지 않은 카테고리: ${carData.category}. 지원 카테고리: ${Object.keys(CATEGORY_MAP).join(', ')}`);
  }
  carData.categoryName = CATEGORY_MAP[carData.category];

  // 이미지 파일 존재 여부 확인
  const imgFullPath = path.join(ROOT_DIR, carData.image);
  if (!fs.existsSync(imgFullPath)) {
    console.warn(`⚠️ 경고: 이미지 파일(${carData.image})이 아직 생성되지 않았습니다.`);
  }

  let source = fs.readFileSync(CARS_DATA_PATH, 'utf8');

  // 중복 ID 확인
  const existingIdx = CARS_DATA.findIndex(c => c.id === carData.id);
  if (existingIdx >= 0) {
    console.log(`🔄 기존 등록된 ID '${carData.id}' 업데이트를 진행합니다.`);
    // 기존 객체 교체
    const idRegex = new RegExp(`{\\s*id:\\s*['"]${carData.id}['"][\\s\\S]*?}\\s*(?=,|\\n\\s*\\])`, 'g');
    const newEntry = formatCarObject(carData);
    source = source.replace(idRegex, newEntry.trim());
  } else {
    // 마지막 도안 뒤에 삽입
    const lastItemIdx = source.lastIndexOf('  {\n    id:');
    const arrayEndIdx = source.indexOf('];\n\nexport const CATEGORIES');
    if (arrayEndIdx === -1) {
      throw new Error('js/cars-data.js 파일에서 배열 종료 지점을 찾을 수 없습니다.');
    }

    const formatted = ',\n' + formatCarObject(carData);
    source = source.slice(0, arrayEndIdx) + formatted + '\n' + source.slice(arrayEndIdx);
  }

  fs.writeFileSync(CARS_DATA_PATH, source, 'utf8');
  console.log(`✅ [${carData.name}] (${carData.id}) 도안 정보가 js/cars-data.js 에 성공적으로 등록되었습니다.`);
}

function formatCarObject(car) {
  return `  {
    id: '${car.id}',
    name: '${car.name}',
    nameEn: '${car.nameEn}',
    category: '${car.category}',
    categoryName: '${car.categoryName}',
    difficulty: '${car.difficulty}',
    description: '${car.description}',
    image: '${car.image}',
    defaultColor: '${car.defaultColor}',
    accentColor: '${car.accentColor}'
  }`;
}

const params = parseArgs();
if (Object.keys(params).length === 0 || params.help) {
  console.log(`
사용법: node register-car.js [옵션]

옵션:
  --id            [필수] 고유 식별자 (예: genesis_g80)
  --name          [필수] 한글 차량명 (예: "제네시스 G80")
  --nameEn        [필수] 영문 차량명 (예: "Genesis G80 Luxury Sedan")
  --category      [필수] 카테고리 ID (sedan, suv_mpv, sports, truck, bus, special, micro)
  --difficulty    [필수] 난이도 ('쉬움', '보통', '어려움 (정밀)')
  --desc          [필수] 차량 설명 (1~2줄)
  --image         [필수] 도안 이미지 경로 (예: "images/cars/sedan/genesis_g80.jpg")
  --defaultColor  [필수] 기본 추천 컬러 HEX (예: "#1c1c1e")
  --accentColor   [필수] 포인트 추천 컬러 HEX (예: "#5e5ce6")
`);
} else {
  if (params.desc && !params.description) {
    params.description = params.desc;
  }
  try {
    registerCar(params);
  } catch (err) {
    console.error('❌ 등록 실패:', err.message);
    process.exit(1);
  }
}
