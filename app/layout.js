import './globals.css'

export const metadata = {
  title: 'LCARS Temporal Monitor',
  description: 'Starfleet-grade productivity timer and time tracking system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}