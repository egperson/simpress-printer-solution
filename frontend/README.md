# Frontend — Printer Monitor (React + Vite + Tailwind)

Este frontend é um protótipo moderno em React + Vite + Tailwind. Ele consome a API no backend (o servidor Express em `../server.js`).

Requisitos
- Node.js 18+

Instalação e desenvolvimento (PowerShell)

```powershell
cd 'c:\Users\LEITEE8\Documents\GitHub\Cursos-de-Desenvolvimento-Web\web-monitor\frontend'
npm install
npm run dev
```

O Vite irá rodar na porta 5173 e está configurado para proxy `/api` para `http://localhost:3000`, então execute também o backend (`npm start` em `web-monitor`) antes de usar.

Build para produção

```powershell
npm run build
npm run preview
```

Observações
- Se preferir, após `npm run build` copie os arquivos de `dist/` para `web-monitor/public/` para que o backend sirva o frontend estático.
