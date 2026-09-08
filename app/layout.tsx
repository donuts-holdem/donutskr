import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DO:NUTS",
  description: "DO:NUTS CLASS · 대학 포커 동아리연합",
};

// Dark-theme platform hints: matches scrollbars/form controls to the theme and
// sets the browser UI color.
export const viewport: Viewport = {
  themeColor: "#0A0908",
  colorScheme: "dark",
};

// Root shell only (html/body/font). Site chrome lives in app/(site)/layout.tsx
// so member and admin routes can use their own navigation.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink overflow-x-clip">{children}</body>
    </html>
  );
}
