import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CRM — Elyon Nexus',
  description: 'CRM inteligente com agentes de IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="h-screen overflow-hidden">{children}</body>
    </html>
  )
}
