import jsQR from 'jsqr';

export interface QrDecodeResult {
  data: string;
  isUpi: boolean;
}

/**
 * Decodes QR code from an HTMLImageElement using hardware-accelerated
 * BarcodeDetector (Chrome/Android/Safari) with fallback to multi-pass jsQR.
 */
export async function decodeQrFromImageElement(img: HTMLImageElement): Promise<string | null> {
  // 1. Hardware BarcodeDetector API (Android Chrome & modern Safari)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await barcodeDetector.detect(img);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Continue to canvas fallback
    }
  }

  // 2. Optimized Canvas jsQR
  const canvas = document.createElement('canvas');
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  // Scale down ultra-high-resolution mobile camera pictures (12MP - 108MP) to avoid memory bottlenecks
  const maxDim = 1200;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, width, height);

  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    });
    return code ? code.data : null;
  } catch {
    return null;
  }
}

/**
 * Decodes QR code from a video frame drawn to canvas in real time.
 */
export async function decodeQrFromCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): Promise<string | null> {
  // 1. Hardware BarcodeDetector (instant 60fps on modern Android)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await barcodeDetector.detect(canvas);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Continue to jsQR fallback
    }
  }

  // 2. jsQR software fallback
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    });
    return code ? code.data : null;
  } catch {
    return null;
  }
}
