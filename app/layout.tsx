import './globals.css';

export const metadata = {
  title: 'MVP Creator OS',
  description: 'AI content generation studio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
