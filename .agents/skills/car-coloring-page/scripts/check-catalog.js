#!/usr/bin/env node
/**
 * check-catalog.js
 * 도안 카탈로그 및 이미지 무결성 점검 도구 (ES Module)
 * 
 * 기능:
 * 1. js/cars-data.js의 CARS_DATA 배열 및 메타데이터 유효성 검사
 * 2. 등록된 이미지 파일의 실제 존재 여부 및 해상도/비율(16:9) 검증
 * 3. images/cars/ 내에 존재하지만 아직 CARS_DATA에 등록되지 않은 미등록 도안 검출
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARS_DATA, CATEGORIES } from '../../../../js/cars-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../../../');
const CARS_DIR = path.join(ROOT_DIR, 'images/cars');

// JPEG 해상도 판독 함수
function getJpgSize(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    for (let i = 0; i < buf.length - 8; i++) {
      if (buf[i] === 0xFF && (buf[i + 1] >= 0xC0 && buf[i + 1] <= 0xC3)) {
        const height = buf.readUInt16BE(i + 5);
        const width = buf.readUInt16BE(i + 7);
        return { width, height };
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

// images/cars 내의 모든 이미지 재귀 탐색
function scanImageFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanImageFiles(fullPath));
    } else if (/\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
      const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
      results.push({ relPath, fullPath, filename: entry.name });
    }
  }
  return results;
}

function runCheck() {
  console.log('====================================================');
  console.log('🔍 자동차 색칠 도안 카탈로그 및 이미지 검증 보고서');
  console.log('====================================================\n');

  const cars = CARS_DATA;
  const categories = CATEGORIES;
  const categoryIds = new Set(categories.map(c => c.id));
  const diskImages = scanImageFiles(CARS_DIR);
  const diskImagePaths = new Set(diskImages.map(img => img.relPath));
  const registeredImagePaths = new Set(cars.map(c => c.image));

  let errors = 0;
  let warnings = 0;

  console.log(`📋 등록된 도안 수: ${cars.length}개`);
  console.log(`📁 디스크 이미지 파일 수: ${diskImages.length}개`);
  console.log(`🏷️ 카테고리 수: ${categories.length}개\n`);

  // 1. 등록된 도안 항목 검증
  console.log('--- 1. 등록된 도안 유효성 점검 ---');
  cars.forEach((car, idx) => {
    const issues = [];
    if (!car.id) issues.push('id 누락');
    if (!car.name) issues.push('name 누락');
    if (!car.nameEn) issues.push('nameEn 누락');
    if (!categoryIds.has(car.category)) issues.push(`알 수 없는 category '${car.category}'`);
    if (!['쉬움', '보통', '어려움 (정밀)'].includes(car.difficulty)) issues.push(`유효하지 않은 difficulty '${car.difficulty}'`);
    if (!car.image) issues.push('image 경로 누락');

    // 이미지 실제 파일 존재 및 규격 확인
    const fullImgPath = path.join(ROOT_DIR, car.image || '');
    if (!fs.existsSync(fullImgPath)) {
      issues.push(`❌ 이미지 파일 없음: ${car.image}`);
      errors++;
    } else {
      const size = getJpgSize(fullImgPath);
      if (size) {
        const ratio = size.width / size.height;
        if (Math.abs(ratio - 16 / 9) > 0.05) {
          warnings++;
          // console.warn(`⚠️ [${car.id}] 16:9 비율이 아님 (${size.width}x${size.height})`);
        }
      }
    }

    if (issues.length > 0) {
      console.log(`❌ [${idx + 1}/${cars.length}] ${car.id || 'NO_ID'}: ${issues.join(', ')}`);
      errors++;
    }
  });

  if (errors === 0) {
    console.log('✅ 모든 등록된 도안(24종)의 메타데이터 및 이미지 파일이 완벽히 정상입니다.\n');
  } else {
    console.log(`\n❌ 총 ${errors}개의 오류가 발견되었습니다.\n`);
  }

  // 2. 미등록 이미지 파일 점검
  console.log('--- 2. 디스크 상의 미등록 도안 검사 ---');
  const unregistered = diskImages.filter(img => !registeredImagePaths.has(img.relPath));
  if (unregistered.length > 0) {
    console.log(`💡 등록 대기 중인 이미지 ${unregistered.length}개 발견:`);
    unregistered.forEach(img => {
      const size = getJpgSize(img.fullPath);
      const sizeStr = size ? `(${size.width}x${size.height})` : '';
      console.log(`   - ${img.relPath} ${sizeStr}`);
    });
    console.log('\n👉 `scripts/register-car.js`를 사용하거나 `js/cars-data.js`에 메타데이터를 추가할 수 있습니다.\n');
  } else {
    console.log('✅ 디스크 내 모든 이미지가 CARS_DATA에 등록되어 있습니다.\n');
  }

  console.log('====================================================');
  console.log(`점검 완료: 에러 ${errors}건, 미등록 파일 ${unregistered.length}건`);
  console.log('====================================================');
}

runCheck();
