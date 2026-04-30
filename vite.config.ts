import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    ViteImageOptimizer({
      // public/* 의 이미지들도 처리되도록 includePublic: true
      includePublic: true,
      logStats: true,
      png: {
        quality: 80,
      },
      jpeg: {
        quality: 78,
        mozjpeg: true,
      },
      jpg: {
        quality: 78,
        mozjpeg: true,
      },
      webp: {
        quality: 78,
      },
      avif: {
        quality: 70,
      },
    }),
  ],
})
