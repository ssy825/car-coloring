// 고속 스마트 플러드 필 (Flood Fill / 페인트통) 모듈

/**
 * 픽셀 색상 차이 계산 (유클리드 거리 기반 또는 RGB 최대 차이)
 */
function colorMatch(r1, g1, b1, a1, r2, g2, b2, a2, tolerance) {
  // 투명도 차이
  if (Math.abs(a1 - a2) > tolerance) return false;
  // RGB 유클리드 차이 (허용치 체크)
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (dr * dr + dg * dg + db * db) <= (tolerance * tolerance * 3);
}

/**
 * 라인아트 픽셀이 외곽선(검은색/어두운 선)인지 여부 확인
 */
function isLineArtBoundary(r, g, b, a, darknessThreshold = 85) {
  if (a < 50) return false; // 완전 투명은 경계 아님
  // 상대 밝기 (Luminance)
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < darknessThreshold;
}

/**
 * 스마트 플러드 필 실행 함수
 * @param {CanvasRenderingContext2D} paintCtx - 사용자가 칠하는 채색 레이어 Context
 * @param {CanvasRenderingContext2D} lineCtx - 도안 외곽선 레이어 Context (경계 판정용)
 * @param {number} startX - 클릭한 X 좌표
 * @param {number} startY - 클릭한 Y 좌표
 * @param {Object} fillColor - {r, g, b, a} (0~255)
 * @param {number} tolerance - 색상 오차 허용치 (기본값 40)
 */
export function performSmartFloodFill(paintCtx, lineCtx, startX, startY, fillColor, tolerance = 42) {
  const width = paintCtx.canvas.width;
  const height = paintCtx.canvas.height;

  startX = Math.floor(startX);
  startY = Math.floor(startY);

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return false;
  }

  // Paint 레이어와 LineArt 레이어 픽셀 데이터 가져오기
  const paintImageData = paintCtx.getImageData(0, 0, width, height);
  const paintData = paintImageData.data;

  const lineImageData = lineCtx.getImageData(0, 0, width, height);
  const lineData = lineImageData.data;

  const startIdx = (startY * width + startX) * 4;

  // 시작 위치가 이미 도안의 굵은 검은색 외곽선 위라면 채우지 않음
  if (isLineArtBoundary(lineData[startIdx], lineData[startIdx + 1], lineData[startIdx + 2], lineData[startIdx + 3], 65)) {
    return false;
  }

  const targetR = paintData[startIdx];
  const targetG = paintData[startIdx + 1];
  const targetB = paintData[startIdx + 2];
  const targetA = paintData[startIdx + 3];

  const fillR = fillColor.r;
  const fillG = fillColor.g;
  const fillB = fillColor.b;
  const fillA = fillColor.a !== undefined ? fillColor.a : 255;

  // 이미 같은 색상인 경우 즉시 리턴
  if (
    Math.abs(targetR - fillR) < 5 &&
    Math.abs(targetG - fillG) < 5 &&
    Math.abs(targetB - fillB) < 5 &&
    Math.abs(targetA - fillA) < 5
  ) {
    return false;
  }

  // 방문 여부 및 채울 픽셀 마스크 (Uint8Array)
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height * 2);
  let queueHead = 0;
  let queueTail = 0;

  queue[queueTail++] = startX;
  queue[queueTail++] = startY;
  visited[startY * width + startX] = 1;

  // BFS 플러드 필 수행
  while (queueHead < queueTail) {
    const x = queue[queueHead++];
    const y = queue[queueHead++];
    const pixelIndex = y * width + x;
    const dataIdx = pixelIndex * 4;

    // 채색 데이터 업데이트
    paintData[dataIdx] = fillR;
    paintData[dataIdx + 1] = fillG;
    paintData[dataIdx + 2] = fillB;
    paintData[dataIdx + 3] = fillA;

    // 4방향 이웃 탐색 (상, 하, 좌, 우)
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ];

    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIndex = ny * width + nx;
        if (!visited[nIndex]) {
          const nDataIdx = nIndex * 4;

          // 1. 도안 외곽선 레이어에서 어두운 선(경계선)인지 검사
          const isLine = isLineArtBoundary(
            lineData[nDataIdx],
            lineData[nDataIdx + 1],
            lineData[nDataIdx + 2],
            lineData[nDataIdx + 3],
            80
          );

          if (!isLine) {
            // 2. 페인트 레이어에서 기존 목표 색상과 허용치 내에서 일치하는지 검사
            const isMatch = colorMatch(
              paintData[nDataIdx],
              paintData[nDataIdx + 1],
              paintData[nDataIdx + 2],
              paintData[nDataIdx + 3],
              targetR,
              targetG,
              targetB,
              targetA,
              tolerance
            );

            if (isMatch) {
              visited[nIndex] = 1;
              queue[queueTail++] = nx;
              queue[queueTail++] = ny;
            }
          }
        }
      }
    }
  }

  // 1픽셀 안티앨리어싱 블렌드 확장 (White Halo 제거)
  // 마스크 외곽 경계선 주변 픽셀을 반투명하게 살짝 확장하여 외곽선 아래로 안착시킴
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (visited[idx] === 1) {
        // 주변 4방향 중 방문 안 된 픽셀 검사
        const adj = [idx + 1, idx - 1, idx + width, idx - width];
        for (let k = 0; k < 4; k++) {
          const aIdx = adj[k];
          if (visited[aIdx] === 0) {
            const nDataIdx = aIdx * 4;
            // 라인아트가 아주 진한 검은색이 아니면 채색 색상으로 약간 덮어줌
            const isHeavyLine = isLineArtBoundary(
              lineData[nDataIdx],
              lineData[nDataIdx + 1],
              lineData[nDataIdx + 2],
              lineData[nDataIdx + 3],
              40
            );
            if (!isHeavyLine) {
              paintData[nDataIdx] = fillR;
              paintData[nDataIdx + 1] = fillG;
              paintData[nDataIdx + 2] = fillB;
              paintData[nDataIdx + 3] = Math.max(paintData[nDataIdx + 3], Math.floor(fillA * 0.85));
            }
          }
        }
      }
    }
  }

  // 캔버스에 수정된 픽셀 버퍼 적용
  paintCtx.putImageData(paintImageData, 0, 0);
  return true;
}
