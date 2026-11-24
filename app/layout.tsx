import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'OZAVEA — Fragrance, thoughtfully chosen', description: 'Discover your signature fragrance at OZAVEA.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ar"><body>{children}</body></html>; }
