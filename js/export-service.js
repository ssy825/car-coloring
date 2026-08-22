/**
 * 작품 내보내기 및 인쇄 서비스 (ExportService)
 * 레이어 병합(배경, 채색, 도안선, 워터마크), PNG 다운로드, 프린터 인쇄를 전담합니다.
 */

export class ExportService {
  /**
   * 레이어를 하나로 합성한 오프스크린 캔버스 생성
   */
  static createMergedCanvas(paintCanvas, lineCanvas, width, height, bgType = 'white') {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');

    // 1. 배경 렌더링
    if (bgType === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'studio') {
      const grad = ctx.createRadialGradient(
        width / 2, height * 0.45, 100,
        width / 2, height * 0.5, width * 0.7
      );
      grad.addColorStop(0, '#2c3647');
      grad.addColorStop(1, '#0e1219');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    // transparent일 경우 아무것도 칠하지 않고 투명 유지

    // 2. 채색 레이어 합성
    if (paintCanvas) {
      ctx.drawImage(paintCanvas, 0, 0);
    }

    // 3. 도안 외곽선 레이어 합성 (Multiply 블렌드)
    if (lineCanvas) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(lineCanvas, 0, 0);
      ctx.restore();
    }

    // 4. 서명 & 워터마크 브랜딩
    ctx.save();
    ctx.fillStyle = bgType === 'studio' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)';
    ctx.font = 'bold 20px Outfit, Montserrat, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🏎️ CAR COLORING STUDIO PRO', width - 40, height - 30);
    ctx.restore();

    return exportCanvas;
  }

  /**
   * 합성된 Data URL 반환
   */
  static getMergedDataUrl(paintCanvas, lineCanvas, width, height, bgType = 'white') {
    const canvas = this.createMergedCanvas(paintCanvas, lineCanvas, width, height, bgType);
    return canvas.toDataURL('image/png');
  }

  /**
   * PNG 파일 다운로드
   */
  static downloadPng(paintCanvas, lineCanvas, width, height, filename, bgType = 'white') {
    const defaultName = `${filename || 'my_car'}_coloring.png`;
    const dataUrl = this.getMergedDataUrl(paintCanvas, lineCanvas, width, height, bgType);

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 프린터 인쇄 팝업 창 호출
   */
  static printArtwork(paintCanvas, lineCanvas, width, height, title = '자동차 색칠') {
    const dataUrl = this.getMergedDataUrl(paintCanvas, lineCanvas, width, height, 'white');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>인쇄 - ${title}</title>
        <style>
          body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fff; }
          img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          @page { size: landscape; margin: 10mm; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print();window.close();" alt="${title}" />
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
