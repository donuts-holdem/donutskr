import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DO:NUTS",
  description: "DO:NUTS Poker Club",
};

// Dark-theme platform hints: matches scrollbars/form controls to the theme and
// sets the browser UI color.
export const viewport: Viewport = {
  themeColor: "#0A0908",
  colorScheme: "dark",
};

// Root shell only (html/body/font). Site chrome lives in app/(site)/layout.tsx
// so full-bleed routes (/lab, /admin) can opt out of the header/footer.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink overflow-x-clip">{children}</body>
    </html>
  );
}
