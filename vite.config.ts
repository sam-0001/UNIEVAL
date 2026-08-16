import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: {
          port: 24679
        }
      },
      plugins: [react()],
      // NOTE: Do NOT expose server-side secrets here.
      // GEMINI_API_KEY is server-only — remove from define block.
      // Only expose public frontend keys prefixed with VITE_
      define: {
        'import.meta.env.VITE_RAZORPAY_KEY_ID': JSON.stringify(env.VITE_RAZORPAY_KEY_ID),
        'import.meta.env.VITE_SUPER_ADMIN_EMAIL': JSON.stringify(env.VITE_SUPER_ADMIN_EMAIL),
        'import.meta.env.VITE_WHATSAPP_GROUP_LINK': JSON.stringify(env.VITE_WHATSAPP_GROUP_LINK),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
