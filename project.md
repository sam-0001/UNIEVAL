# Project: UniEval____

This file documents the structure and setup instructions for this project and its submodules.

## Module: UniEval____ (Root)
**Path:** `./.`

**Package Name:** unieval
**Description:** No description provided.

### Setup Instructions
This is a Node.js module. The `node_modules` folder has been deleted to save space.
To reinstall dependencies and run this module, navigate to its directory and execute:
```bash
cd ./. && npm install
```

**Available Scripts:**
- `npm run dev`: `npx tsx server.ts`
- `npm run build`: `vite build`
- `npm run start`: `NODE_ENV=production npx tsx server.ts`
- `npm run start:pm2`: `pm2 start ecosystem.config.cjs --env production`
- `npm run logs`: `pm2 logs unieval`
- `npm run worker`: `npx tsx worker.ts`
- `npm run db:indexes`: `npx tsx scripts/addIndexes.ts`
- `npm run start:prod`: `pm2 start ecosystem.config.cjs --env production`
- `npm run test`: `vitest run`
- `npm run test:watch`: `vitest`
- `npm run test:coverage`: `vitest run --coverage`

**Key Dependencies:**
```json
{
  "@aws-sdk/client-s3": "^3.1002.0",
  "@aws-sdk/s3-request-presigner": "^3.1002.0",
  "@ffmpeg-installer/ffmpeg": "^1.1.0",
  "@google/genai": "^1.41.0",
  "@sentry/node": "^10.51.0",
  "bcryptjs": "^3.0.3",
  "bullmq": "^5.76.4",
  "compression": "^1.8.1",
  "cors": "^2.8.6",
  "dotenv": "^17.3.1",
  "express": "^5.2.1",
  "express-rate-limit": "^7.5.0",
  "firebase": "^12.14.0",
  "fluent-ffmpeg": "^2.1.3",
  "helmet": "^8.1.0",
  "hls.js": "^1.6.15",
  "ioredis": "^5.10.1",
  "jsonwebtoken": "^9.0.3",
  "lucide-react": "^0.577.0",
  "mongoose": "^9.2.4",
  "adm-zip": "^0.5.16",
  "multer": "^2.0.2",
  "nodemailer": "^8.0.1",
  "pdfjs-dist": "^4.10.38",
  "react": "^19.2.5",
  "react-dom": "^19.2.5",
  "react-router-dom": "^7.13.0",
  "tsx": "^4.21.0",
  "winston": "^3.19.0"
}
```
---

