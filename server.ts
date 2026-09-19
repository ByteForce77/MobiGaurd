import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Set payload limit to 15mb to allow high-res mobile photos and screenshots
app.use(express.json({ limit: '15mb' }));

// Lazy initialization of Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Health check endpoint for Cloud Run ingress and monitoring
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Live Time endpoint for New Delhi (IST - UTC+5:30)
app.get('/api/time', (req, res) => {
  const now = new Date();
  
  // Format specifically for Asia/Kolkata (New Delhi)
  const delhiTimeFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const parts = delhiTimeFormatter.formatToParts(now);
  const formattedDelhi = delhiTimeFormatter.format(now);

  res.json({
    status: 'ok',
    timezone: 'Asia/Kolkata',
    city: 'New Delhi',
    country: 'India',
    offset: '+05:30',
    iso: now.toISOString(),
    epochMs: now.getTime(),
    formatted: formattedDelhi,
    details: {
      weekday: parts.find(p => p.type === 'weekday')?.value,
      day: parts.find(p => p.type === 'day')?.value,
      month: parts.find(p => p.type === 'month')?.value,
      year: parts.find(p => p.type === 'year')?.value,
      hour: parts.find(p => p.type === 'hour')?.value,
      minute: parts.find(p => p.type === 'minute')?.value,
      second: parts.find(p => p.type === 'second')?.value,
      dayPeriod: parts.find(p => p.type === 'dayPeriod')?.value
    }
  });
});

// Gemini AI Analysis endpoint for deep threat evaluation
app.post('/api/analyze-ai', async (req, res) => {
  try {
    const { text, sender } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content is required for analysis' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        available: false,
        source: 'local_fallback',
        message: 'GEMINI_API_KEY is not configured on the server. Falling back to on-device engine.',
        verdict: 'SUSPICIOUS',
        summary: 'Server AI API key is not active. Using on-device security heuristics.'
      });
    }

    const prompt = `You are MobiGuard AI, an expert cybersecurity and anti-fraud intelligence system protecting Indian mobile users from smishing, fake KYC alerts, lottery scams, electricity bill fraud, and UPI scams.

Analyze the following mobile message and sender:
Sender ID: ${sender || 'Unknown Sender'}
Message Body: """${text}"""

Provide a comprehensive threat evaluation in valid JSON matching this schema:
{
  "verdict": "FRAUD RISK" | "SUSPICIOUS" | "GENUINE",
  "threatScore": number (0 to 100),
  "confidence": number (0 to 100),
  "category": string (e.g. "KYC Expiry Scam", "Electricity Bill Phishing", "Job Task Scam", "Legitimate Bank OTP", "UPI Payment Trap"),
  "psychologicalTriggers": string[] (e.g. ["Artificial Urgency", "Fear of Disconnection", "Authority Impersonation", "Greed"]),
  "senderReputation": "KNOWN_LEGITIMATE" | "SPOOFED_OR_SUSPICIOUS" | "UNKNOWN_MOBILE_NUMBER",
  "reasoning": string (clear, concise explanation under 60 words for the user),
  "shouldBlockSender": boolean,
  "recommendedAction": string (actionable advice for the user)
}
Return ONLY pure JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {
        verdict: 'SUSPICIOUS',
        threatScore: 65,
        confidence: 80,
        category: 'Unverified Communication',
        psychologicalTriggers: ['Unverified Source'],
        senderReputation: 'UNKNOWN_MOBILE_NUMBER',
        reasoning: responseText.slice(0, 150),
        shouldBlockSender: true,
        recommendedAction: 'Do not click links or share credentials.'
      };
    }

    return res.json({
      available: true,
      source: 'gemini_3.8_flash',
      ...parsedData
    });
  } catch (err: any) {
    console.error('Error during Gemini API analysis:', err);
    return res.status(500).json({
      error: 'Failed to run AI analysis',
      details: err?.message || 'Unknown error'
    });
  }
});

// Real Mobile Screenshot / Photo OCR Endpoint using Gemini Vision
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 string is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        available: false,
        source: 'local_fallback_required',
        message: 'Server Gemini API key not present. Use on-device Tesseract OCR.'
      });
    }

    // Strip data url header if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg'
          }
        },
        {
          text: `You are an expert mobile OCR and cybersecurity scanner.
Analyze this mobile screenshot or photo (e.g. SMS, WhatsApp message, UPI payment screen, bank alert, electricity warning, or physical document).
Extract all visible text accurately.
Identify the sender ID, contact number, or SMS header (e.g., "VK-SBIBNK", "+91 98765 43210", or "Unknown Sender").
Return a JSON object in this exact schema:
{
  "extractedText": string (the exact text transcribed accurately without summarization),
  "sender": string (the sender header or phone number, or "Unknown Sender"),
  "detectedCategory": string (e.g., "Bank Alert", "SMS Smishing", "WhatsApp Forward", "UPI Intent", "General")
}
Return ONLY valid JSON.`
        }
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {
        extractedText: responseText.trim(),
        sender: 'Unknown Sender',
        detectedCategory: 'Screenshot OCR'
      };
    }

    return res.json({
      available: true,
      source: 'gemini_vision',
      ...parsedData
    });
  } catch (err: any) {
    console.error('Error during OCR processing:', err);
    return res.status(500).json({
      error: 'Failed to extract text from image',
      details: err?.message || 'Unknown error'
    });
  }
});

// Start Server & mount Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MobiGuard Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
