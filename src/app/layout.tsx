import type { Metadata } from 'next';
// import { Geist, Geist_Mono } from "next/font/google";
import { Inter } from 'next/font/google';
import './globals.css';
import ToasterContext from './context/ToasterContext';
import AuthContext from './context/AuthContext';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Catatan Cerdas',
  description: 'Streamline Your Notes',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AuthContext>
          <ToasterContext />
          {children}
        </AuthContext>
      </body>
    </html>
  );
}
