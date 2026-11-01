import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // No hand-made charts chunk: recharts is only used by the lazily loaded Insights page, so it splits
          // off by itself. (Grouping it here also pulled React in, making every page download the charts library.)
          if (id.includes('@supabase')) return 'supabase'
        },
      },
    },
  },
})
