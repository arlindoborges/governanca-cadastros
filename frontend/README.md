# Frontend

Interface Next.js do MVP de Governança de Cadastros.

Tecnologia: Next.js + TypeScript, Node.js 24 LTS.

```powershell
Copy-Item .env.example .env.local
npm install
npm run generate:api
npm run dev
```

A aplicação abre em `/` sem login. A área Importações cobre envio de planilha XLSX, mapeamento e erros por linha.

```powershell
npm run build
npm run test:e2e
```
