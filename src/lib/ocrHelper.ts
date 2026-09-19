import Tesseract from 'tesseract.js';

export interface SampleScreenshot {
  id: string;
  title: string;
  category: 'KYC Scam' | 'Electricity Scam' | 'Genuine OTP' | 'Refund Phish';
  description: string;
  extractedText: string;
  badge: '🔴 FRAUD' | '🟢 GENUINE';
}

export interface OcrResult {
  text: string;
  sender?: string;
  source: 'gemini_vision' | 'tesseract_on_device' | 'preset';
  confidence?: number;
}

export const SAMPLE_SCREENSHOTS: SampleScreenshot[] = [
  {
    id: 'ss_kyc',
    title: 'SBI YONO KYC Expiry Threat',
    category: 'KYC Scam',
    description: 'Screenshot of SMS threatening account freeze unless ₹99 is paid online.',
    extractedText: 'Dear customer, your SBI YONO account KYC has expired. Pay ₹99 immediately to avoid permanent account block. Click here to verify: bit.ly/sbi-kyc-update',
    badge: '🔴 FRAUD'
  },
  {
    id: 'ss_electricity',
    title: 'Electricity Power Cut Notice',
    category: 'Electricity Scam',
    description: 'WhatsApp forward threatening electricity disconnection tonight at 9:30 PM.',
    extractedText: 'Dear consumer, your electricity power will be disconnected tonight at 9:30 PM from the sub-station due to unpaid last month bill. Please contact electricity officer immediately at 9876543210 or update bill at bit.ly/power-bill',
    badge: '🔴 FRAUD'
  },
  {
    id: 'ss_genuine_otp',
    title: 'HDFC Bank Authentic OTP',
    category: 'Genuine OTP',
    description: 'Real banking transactional message without phishing links.',
    extractedText: 'Your OTP for login to HDFC Bank Internet Banking is 482910. Valid for 5 mins. Do not share OTP with anyone including bank officials.',
    badge: '🟢 GENUINE'
  },
  {
    id: 'ss_refund_phish',
    title: 'E-Commerce Cashback Refund',
    category: 'Refund Phish',
    description: 'Message requesting PIN verification to receive pending refund.',
    extractedText: 'Amazon Refund Dept: Your refund of ₹1,999 is approved. Pay ₹10 verification charge to transfer directly to your UPI: upi://pay?pa=random123@ybl&am=1999&tn=refund',
    badge: '🔴 FRAUD'
  }
];

/**
 * Pre-processes an image file on canvas to optimize contrast and clarity for OCR
 */
function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Limit max dimension to 1600px for speed and memory efficiency on mobile
        let { width, height } = img;
        const maxDim = 1600;
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
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Adjust contrast slightly for text legibility
        try {
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            // Slight contrast boost
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const factor = 1.15;
            const adjusted = Math.min(255, Math.max(0, factor * (avg - 128) + 128));
            data[i] = adjusted;
            data[i + 1] = adjusted;
            data[i + 2] = adjusted;
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        } catch {
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Real OCR extraction from user-uploaded images or camera snapshots.
 * Priority 1: High-precision Gemini Vision (/api/ocr) if available and online.
 * Priority 2: 100% on-device local Tesseract.js engine (works offline & in Airplane Mode).
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (status: string, percent: number) => void
): Promise<OcrResult> {
  onProgress?.('Preparing image...', 10);
  const processedDataUrl = await preprocessImage(file);

  // Try API route first if online
  if (navigator.onLine) {
    try {
      onProgress?.('Scanning with AI Vision...', 30);
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: processedDataUrl,
          mimeType: file.type || 'image/jpeg'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.available && data.extractedText && data.extractedText.trim().length > 0) {
          onProgress?.('Analysis complete', 100);
          return {
            text: data.extractedText.trim(),
            sender: data.sender !== 'Unknown Sender' ? data.sender : undefined,
            source: 'gemini_vision',
            confidence: 96
          };
        }
      }
    } catch {
      // Fall through to on-device Tesseract
    }
  }

  // Fallback: On-Device Tesseract.js OCR
  try {
    onProgress?.('Initializing on-device OCR engine...', 40);
    const workerResult = await Tesseract.recognize(
      processedDataUrl || file,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(40 + (m.progress || 0) * 55);
            onProgress?.(`Reading text on-device (${Math.round((m.progress || 0) * 100)}%)...`, pct);
          }
        }
      }
    );

    const cleanText = workerResult.data.text.trim();
    if (!cleanText) {
      throw new Error('No readable text detected in this image');
    }

    onProgress?.('Extraction completed', 100);
    return {
      text: cleanText,
      source: 'tesseract_on_device',
      confidence: Math.round(workerResult.data.confidence || 80)
    };
  } catch (err: any) {
    console.warn('Tesseract OCR failed:', err);
    throw new Error(
      err?.message || 'Could not extract text from this image. Please ensure the screenshot has clear, visible text.'
    );
  }
}
