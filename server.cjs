const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Converte URL do Google Drive para URL direta ──────────────────────────
function convertDriveUrl(url) {
  if (!url) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
}

// ── Health check ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Estúdio Gabryelle · Gerador de Slides' });
});

// ── Gerar slides PNG ──────────────────────────────────────────────────────
app.post('/gerar-slides', async (req, res) => {
  const { slides, logoGold, logoDark, fotoUrl, bgImageUrl } = req.body;

  if (!slides || !slides.length) {
    return res.status(400).json({ erro: 'Slides não fornecidos.' });
  }

  // Converte URLs do Google Drive
  const fotoUrlConvertida = convertDriveUrl(fotoUrl);
  const bgImageUrlConvertida = convertDriveUrl(bgImageUrl);

  let browser;
  try {
    const chromeDir = '/opt/render/project/src/.chrome';
    const chromePath = `${chromeDir}/chrome/linux-121.0.6167.85/chrome-linux64/chrome`;

    if (!fs.existsSync(chromePath)) {
      console.log('Chrome não encontrado, instalando...');
      execSync('npx puppeteer browsers install chrome', {
        env: { ...process.env, PUPPETEER_CACHE_DIR: chromeDir },
        stdio: 'inherit'
      });
      console.log('Chrome instalado com sucesso!');
    }

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: chromePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    });

    const imagens = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const html = buildSlideHTML(slide, i, slides.length, logoGold, logoDark, fotoUrlConvertida, bgImageUrlConvertida);

      const page = await browser.newPage();
      await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

      await page.evaluateHandle('document.fonts.ready');
      await new Promise(r => setTimeout(r, 1000));

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1080, height: 1080 },
      });

      imagens.push(screenshot.toString('base64'));
      await page.close();
    }

    await browser.close();
    res.json({ imagens });

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('Erro ao gerar slides:', err);
    res.status(500).json({ erro: 'Erro ao gerar slides: ' + err.message });
  }
});

// ── Builder HTML ──────────────────────────────────────────────────────────
function buildSlideHTML(slide, idx, total, logoGold, logoDark, fotoUrl, bgImageUrl) {
  const tipo = slide.tipo;
  const mainBg = fotoUrl || bgImageUrl || null;
  const contentBg = bgImageUrl || null;

  const baseStyle = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Montserrat:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 1080px; height: 1080px; overflow: hidden; }
    .slide { width: 1080px; height: 1080px; position: relative; font-family: 'Montserrat', sans-serif; }
  `;

  if (tipo === 'capa') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${baseStyle}
      .slide {
        background: ${mainBg ? `url('${mainBg}') center top / cover no-repeat` : '#2C2420'};
        display: flex; flex-direction: column; justify-content: space-between;
        padding: 64px 72px;
      }
      .overlay { position: absolute; inset: 0; background: linear-gradient(165deg, rgba(44,36,32,.4) 0%, rgba(44,36,32,.95) 100%); }
      .top { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: flex-start; }
      .logo { height: 52px; object-fit: contain; }
      .handle { font-size: 18px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #CDA162; }
      .bottom { position: relative; z-index: 1; }
      .tag { font-size: 16px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: #CDA162; margin-bottom: 28px; }
      .titulo { font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: ${slide.titular.length > 35 ? '64px' : '76px'}; line-height: 1.18; color: #F5EFE0; margin-bottom: 32px; text-shadow: 0 2px 8px rgba(0,0,0,.35); }
      .linha { width: 72px; height: 3px; background: linear-gradient(90deg, #CDA162, #886337); }
      .borda-top { position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, transparent, #CDA162, transparent); }
      .borda-bot { position: absolute; bottom: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, transparent, #CDA162, transparent); }
    </style></head><body>
    <div class="slide">
      <div class="overlay"></div>
      <div class="borda-top"></div>
      <div class="top">
        <img class="logo" src="data:image/png;base64,${logoGold}" alt="GC"/>
        <span class="handle">@gabryellec</span>
      </div>
      <div class="bottom">
        <div class="tag">Regularização de Obras</div>
        <div class="titulo">${slide.titular}</div>
        <div class="linha"></div>
      </div>
      <div class="borda-bot"></div>
    </div>
    </body></html>`;
  }

  if (tipo === 'cta') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${baseStyle}
      .slide { background: linear-gradient(155deg, #2C2420, #1a1410); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 80px; gap: 32px; }
      .logo { height: 80px; object-fit: contain; }
      .titulo { font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 56px; line-height: 1.25; color: #F5EFE0; max-width: 800px; }
      .corpo { font-size: 28px; color: #C4B49E; line-height: 1.65; max-width: 720px; }
      .btn { background: linear-gradient(135deg, #CDA162, #886337); color: #fff; border-radius: 60px; padding: 24px 64px; font-size: 28px; font-weight: 700; letter-spacing: .06em; }
      .borda-top { position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, transparent, #CDA162, transparent); }
      .borda-bot { position: absolute; bottom: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, transparent, #CDA162, transparent); }
    </style></head><body>
    <div class="slide">
      <div class="borda-top"></div>
      <img class="logo" src="data:image/png;base64,${logoGold}" alt="GC"/>
      <div class="titulo">${slide.titular}</div>
      <div class="corpo">${slide.corpo}</div>
      <div class="btn">Fale com Gabryelle</div>
      <div class="borda-bot"></div>
    </div>
    </body></html>`;
  }

  const isD = tipo === 'destaque';
  const bgStyle = contentBg ? `background: url('${contentBg}') center / cover no-repeat;` : `background: #F0EAE0;`;
  const overlayOpacity = contentBg ? '0.93' : '0';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${baseStyle}
    .slide { ${bgStyle} display: flex; flex-direction: column; padding: 64px 72px; }
    .overlay { position: absolute; inset: 0; background: rgba(245,240,234,${overlayOpacity}); }
    .num { position: relative; z-index: 1; font-size: 18px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #886337; margin-bottom: 32px; }
    .titulo { position: relative; z-index: 1; font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: ${slide.titular.length > 35 ? '58px' : '68px'}; line-height: 1.2; color: #2C2420; margin-bottom: 32px; flex: 1; }
    .corpo { position: relative; z-index: 1; font-size: 26px; color: #5C5048; line-height: 1.75; font-weight: 400; }
    .destaque { position: relative; z-index: 1; margin-top: 40px; padding: 24px 32px; background: rgba(184,137,64,.13); border-left: 6px solid #B88940; border-radius: 0 10px 10px 0; font-size: 26px; font-weight: 700; color: #886337; line-height: 1.4; }
    .footer { position: relative; z-index: 1; display: flex; justify-content: flex-end; margin-top: 32px; }
    .logo-small { height: 36px; opacity: .22; object-fit: contain; }
    .borda-bot { position: absolute; bottom: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, transparent, #B88940, transparent); }
  </style></head><body>
  <div class="slide">
    <div class="overlay"></div>
    <div class="borda-bot"></div>
    <div class="num">${slide.numero}/${total - 1} · ${isD ? 'DESTAQUE' : 'CONTEÚDO'}</div>
    <div class="titulo">${slide.titular}</div>
    <div class="corpo">${slide.corpo}</div>
    ${slide.destaque ? `<div class="destaque">${slide.destaque}</div>` : ''}
    <div class="footer">
      <img class="logo-small" src="data:image/png;base64,${logoDark}" alt="GC"/>
    </div>
  </div>
  </body></html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Servidor rodando na porta ${PORT}`);
});

