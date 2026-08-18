import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond, Alex_Brush } from "next/font/google";
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

const alexBrush = Alex_Brush({
  variable: "--font-brush-loaded",
  weight: "400",
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
      suppressHydrationWarning
      className={`${jakarta.variable} ${lora.variable} ${alexBrush.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          // Blocking, runs before first paint — avoids a flash of the wrong theme.
          // Light is the default; only an explicit "dark" in localStorage flips it.
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
