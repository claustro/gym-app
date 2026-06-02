import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Sostituisci "gymlog" con il nome esatto del tuo repository GitHub
  base: '/gym-app/', 
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Aggiorna automaticamente l'app se ci sono modifiche
      manifest: {
        name: 'GymLog 5.0',
        short_name: 'GymLog',
        description: 'Il tuo diario di allenamento',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone', // Nasconde la barra del browser facendola sembrare nativa
        icons: [
          {
            src: 'icon-192x192.png', // Devi creare queste icone e metterle nella cartella "public"
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})