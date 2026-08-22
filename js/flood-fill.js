/**
 * 고속 스마트 플러드 필 (High-Performance Smart Flood Fill / 페인트통) 모듈
 * 버퍼 재사용 풀링과 최적화된 픽셀 탐색 및 외곽선 안티앨리어싱 확장을 제공합니다.
 */

// 메모리 재할당(GC Thrashing) 방지를 위한 버퍼 풀
let _cachedSize = 0;
let _visited = null;
let _queue = null;

function ensureBuffers(totalPixels) {
  if (_cachedSize < totalPixels) {
    _cachedSize = totalPixels;
    _visited = new Uint8Array(totalPixels);
    _queue = new Int32Array(totalPixels * 2);
  } else {
    _visited.fill(0);
  }
  return { visited: _visited, queue: _queue };
}

/**
 * 픽셀 색상 차이 검사
 */
function colorMatch(r1, g1, b1, a1, r2, g2, b2, a2, tolerance) {
  if (Math.abs(a1 - a2) > tolerance) return false;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (dr * dr + dg * dg + db * db) <= (tolerance * tolerance * 3);
}

/**
 * 라인아트 픽셀이 외곽선(검은색/어두운 경계선)인지 여부 확인
 */
function isLineArtBoundary(r, g, b, a, darknessThreshold = 85) {
  if (a < 50) return false;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < darknessThreshold;
}

/**
 * 스마트 플러드 필 실행 함수
 * @param {CanvasRenderingContext2D} paintCtx - 사용자 채색 레이어 Context
 * @param {CanvasRenderingContext2D} lineCtx - 도안 외곽선 레이어 Context
 * @param {number} startX - 클릭한 X 좌표
 * @param {number} startY - 클릭한 Y 좌표
 * @param {Object} fillColor - {r, g, b, a} (0~255)
 * @param {number} tolerance - 색상 오차 허용치 (기본값 42)
 */
export function performSmartFloodFill(paintCtx, lineCtx, startX, startY, fillColor, tolerance = 42) {
  const width = paintCtx.canvas.width;
  const height = paintCtx.canvas.height;

  startX = Math.floor(startX);
  startY = Math.floor(startY);

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return false;
  }

  const paintImageData = paintCtx.getImageData(0, 0, width, height);
  const paintData = paintImageData.data;

  const lineImageData = lineCtx.getImageData(0, 0, width, height);
  const lineData = lineImageData.data;

  const startIdx = (startY * width + startX) * 4;

  // 시작 위치가 도안 외곽선(검은 경계선)이면 채우지 않음
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

  // 이미 같은 색상인 경우 즉시 종료
  if (
    Math.abs(targetR - fillR) < 5 &&
    Math.abs(targetG - fillG) < 5 &&
    Math.abs(targetB - fillB) < 5 &&
    Math.abs(targetA - fillA) < 5
  ) {
    return false;
  }

  // 버퍼 풀 확보
  const totalPixels = width * height;
  const { visited, queue } = ensureBuffers(totalPixels);

  let queueHead = 0;
  let queueTail = 0;

  queue[queueTail++] = startX;
  queue[queueTail++] = startY;
  visited[startY * width + startX] = 1;

  // 고속 큐 기반 Flood Fill
  while (queueHead < queueTail) {
    const x = queue[queueHead++];
    const y = queue[queueHead++];
    const pixelIndex = y * width + x;
    const dataIdx = pixelIndex * 4;

    paintData[dataIdx] = fillR;
    paintData[dataIdx + 1] = fillG;
    paintData[dataIdx + 2] = fillB;
    paintData[dataIdx + 3] = fillA;

    // 4방향 이웃 검사
    const neighbors = [
      x + 1, y,
      x - 1, y,
      x, y + 1,
      x, y - 1
    ];

    for (let i = 0; i < 8; i += 2) {
      const nx = neighbors[i];
      const ny = neighbors[i + 1];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIndex = ny * width + nx;
        if (!visited[nIndex]) {
          const nDataIdx = nIndex * 4;

          // 도안 외곽선 여부
          const isLine = isLineArtBoundary(
            lineData[nDataIdx],
            lineData[nDataIdx + 1],
            lineData[nDataIdx + 2],
            lineData[nDataIdx + 3],
            80
          );

          if (!isLine) {
            // 페인트 레이어 목표 색상 일치 여부
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

  // 안티앨리어싱 경계선 1px 확장 (White Halo 제거)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (visited[idx] === 1) {
        const adj = [idx + 1, idx - 1, idx + width, idx - width];
        for (let k = 0; k < 4; k++) {
          const aIdx = adj[k];
          if (visited[aIdx] === 0) {
            const nDataIdx = aIdx * 4;
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

  paintCtx.putImageData(paintImageData, 0, 0);
  return true;
}
