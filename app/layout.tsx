import './globals.css'

export const metadata = {
  title: 'SIAC - Sistema de Repuestos',
  description: 'Servicios de Ingeniería en Aguas Clínicas',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
