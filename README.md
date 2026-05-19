# Gabryelle Server · Gerador de Slides PNG

Servidor que gera slides 1080x1080 em alta qualidade usando Puppeteer.

## Deploy no Render.com (gratuito)

1. Crie conta em render.com com GitHub
2. Clique em "New" → "Web Service"
3. Conecte o repositório `gabryelle-server`
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Clique em "Create Web Service"
6. Aguarde ~3 minutos
7. Copie a URL gerada (ex: `gabryelle-server.onrender.com`)
8. Cole essa URL no Estúdio Gabryelle

## Testando

```
GET https://gabryelle-server.onrender.com/
→ {"status":"ok","service":"Estúdio Gabryelle · Gerador de Slides"}
```
