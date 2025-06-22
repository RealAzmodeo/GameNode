import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiApiKey = env.GEMINI_API_KEY;
    return {
      define: {
        // Expose a flag indicating API key availability, not the key itself for client-side.
        // The actual key will be picked up from the environment in Node.js contexts.
        'process.env.GEMINI_API_KEY_AVAILABLE': JSON.stringify(!!geminiApiKey),
        // For server-side code (like agentService when running in Node directly or Vite dev server),
        // process.env.GEMINI_API_KEY will be used directly from the environment.
        // This define below is more for consistency if some part of server-side code
        // *during Vite's processing* tries to access it via `process.env.GEMINI_API_KEY`.
        // The crucial part is that it's NOT exposed to the client bundle if not used.
        // However, best practice is to rely on runtime environment variables for server-side.
        // To be safe and explicit, we avoid defining process.env.GEMINI_API_KEY for client bundle.
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
