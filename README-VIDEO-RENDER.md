# Gerador de Vídeos - Documentação Técnica (Renderização Real)

Este projeto contém o frontend em React/Vite e o backend em Express (Node.js) configurado para renderizar vídeos verticalmente (1080x1920) para Reels, TikTok, e Status através da engine do Remotion e FFmpeg.

## Arquitetura Implementada

1. **Frontend (React)**: O usuário envia as fotos, arquivo de áudio (MP3), e recortes de tempo, junto com os estilos e prompt de criação `VideoGenerator.tsx`.
2. **Backend / API (`server.ts`)**: Uma rota `/api/render-video` assíncrona recebe os dados visuais.
3. **Gemini IA**: O script envia o prompt para o Gemini 3.1 Pro no backend para gerar e planejar as animações do vídeo e roteiro JSON.
4. **Remotion (`src/remotion`)**: Registra as composições em React (`MainVideo.tsx`).
5. **Puppeteer + FFmpeg**: O script no backend utiliza o `@remotion/bundler` para transpilar internamente a `MainComposition` via Webpack e usa o `@remotion/renderer` para processar cada frame e o FFmpeg compilar tudo em formato x264/MP4 diretamente para a pasta `renders/`.

## Instalação e Execução Local

### Pré-requisitos
- Node.js versão LTS (>= 18)
- Chromium / Google Chrome instalado no sistema (necessário para o Remotion compilar os web frames)
- FFmpeg instalado no sistema operacional ou disponível globalmente

### Passos de Execução
1. Faça o clone do repositório
2. `npm install`
3. Instale as dependências relacionadas: `npm install remotion @remotion/bundler @remotion/renderer multer fluent-ffmpeg ffmpeg-static`
4. Configure as variáveis de ambiente em um `.env` com a API Key do Gemini:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   ```
5. Rode em ambiente de desenvolvimento fullstack:
   ```bash
   npm run dev
   ```

*(Nota: O Webpack irá gerar o bundle do app Vite (SPA) e o aplicativo Node no mesmo processo).*

## Configuração do FFmpeg
O servidor tentará utilizar os binários nativos que estiverem no `PATH`. Para sistemas em nuvem, verifique se a imagem Docker contêm FFmpeg ou instale o módulo npm `ffmpeg-static` diretamente. O módulo remotion-renderer gerencia automaticamente chamadas para `ffmpeg` durante a encodificação (`renderMedia`).

## Hospedagem Recomendada
Renderização de vídeos pesados (30 frames por segundo, 1080x1920) requer bastante CPU e memória RAM para renderizar de forma rápida e segura através do Chrome Headless. 

- **Google Cloud Run**: Criar uma imagem Docker modificada instalando as bibliotecas do Puppeteer (x11, libnss, etc) + FFmpeg puro, provisionada para uso intenso de 4vCPU à 8vCPU. Ex: `apt-get install -y ffmpeg libxss1 libnss3 ...`
- **AWS Fargate / EC2**
- **Railway / Render** (Verificar se é possível adicionar runtime dependecies do Docker).

### Dicas de Performance e Evitar Timeouts
Em produção real, como no Cloud Run, os roteadores da borda tem timeouts restritos (e.g. 5 minutos). O sistema foi arquitetado com *Job Polling*:
1. O Front faz a requisição em `POST` e o servidor devolve um Job ID imediatamente.
2. O servidor roda a renderização massiva em plano de fundo de forma não bloqueante.
3. O cliente fica "ouvindo/inspecionando" a rota HTTP `GET /api/render-status/:id`. Quando termina, o MP4 estará disponível em `/renders/:id.mp4`.
