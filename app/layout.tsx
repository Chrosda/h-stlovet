import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Höstlovet.se – mindre tjat, mer höstlov",
  description: "Roliga uppdrag inom läsning, rörelse och gemenskap. Planera höstlovet tillsammans.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet"/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
