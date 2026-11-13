import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // el motor FM corre como AudioWorklet (módulo ES)
  worker: { format: 'es' },
})
