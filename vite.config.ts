import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carica le variabili d'ambiente basate sul modo (development/production)
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Definiamo un oggetto vuoto per process.env per evitare crash di librerie terze
      'process.env': {}
    },
    resolve: {
      alias: {
        // Reindirizziamo le chiamate ai moduli Node.js verso il nostro file shim locale
        fs: path.resolve('utils/polyfills.ts'),
        path: path.resolve('utils/polyfills.ts'),
        stream: path.resolve('utils/polyfills.ts'),
      }
    },
    build: {
      outDir: 'dist',
      commonjsOptions: {
        // Aiuta a convertire moduli CommonJS (come ExcelJS) in ES6 per il browser
        transformMixedEsModules: true,
      },
    }
  };
});