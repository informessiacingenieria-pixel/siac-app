import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SIAC',
    short_name: 'SIAC',
    description: 'Sistema de gestión de repuestos',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a3a6b',
    theme_color: '#1a3a6b',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}