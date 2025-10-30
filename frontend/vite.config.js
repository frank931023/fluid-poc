import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
// import { NodeGlobalsPolyfill } from '@esbuild-plugins/node-globals-polyfill';

export default defineConfig({
  plugins: [vue()],
  // optimizeDeps: {
  //   esbuildOptions: {
  //     define: {
  //       global: 'globalThis'
  //     },
  //     plugins: [
  //       NodeGlobalsPolyfill({
  //         buffer: true
  //       })
  //     ]
  //   }
  // }
});
