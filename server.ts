import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";

const app = express();
const PORT = 3000;

app.use(express.json());

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Math.random().toString(36).substring(7)}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// API Routes
app.post("/api/generate-ad-copy", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
      return res.status(400).json({ error: "Para gerar textos, você precisa configurar uma API Key válida do Google Gemini nas Configurações Mestre da plataforma." });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const productInfo = req.body.productInfo || "";
    
    const parts: any[] = [];
    
    // Text prompt
    parts.push({
      text: `Você é um copywriter profissional e especialista em vendas de produtos de beleza e utilidades domésticas (como Tupperware, Eudora, perfumes, cremes, etc).
Sua tarefa é criar um texto publicitário altamente persuasivo para ser enviado no WhatsApp ou postado no Instagram/Facebook.

Informações sobre os produtos passadas pelo vendedor:
${productInfo}

Crie um texto vendedor, com emojis adequados, destacando os pontos fortes e fazendo uma forte chamada para ação no final.
Se as informações falarem sobre um "kit", foque no benefício de comprar todos juntos e na economia.
Não inclua marcadores de código puro, responda diretamente em formato de texto amigável.`
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: parts
    });

    const generatedText = response.text || "Não foi possível gerar.";
    res.json({ text: generatedText });

  } catch (err: any) {
    console.error("Gemini route fail:", err.message);
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
