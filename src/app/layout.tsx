import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const jakarta = DM_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const lora = Cormorant_Garamond({
  variable: "--font-lora",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "John Davy — CEO Dashboard",
  description: "Real-time visibility over business systems, automated workflows, strategic priorities, and operations for the Marisa Peer Organisation & Flowly OS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
