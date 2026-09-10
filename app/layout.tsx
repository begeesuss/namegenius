import type { Metadata, Viewport } from "next";
import {
  Inter,
  Fraunces,
  Space_Grotesk,
  Unbounded,
  Lora,
  Libre_Franklin,
  Fredoka,
} from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

// Name-card typefaces — one per territory, so each suggested name is set in a
// face that matches the feeling that territory evokes (see hero-wash in globals.css).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600"],
  style: ["normal"],
  variable: "--font-name-light",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-name-intel",
});
const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-name-motion",
});
const lora = Lora({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["italic"],
  variable: "--font-name-craft",
});
const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-name-trust",
});
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-name-play",
});

export const metadata: Metadata = {
  title: "Name Genius",
  description: "Find a name worth using.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${spaceGrotesk.variable} ${unbounded.variable} ${lora.variable} ${libreFranklin.variable} ${fredoka.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
