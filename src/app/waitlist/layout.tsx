import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { copy } from "@/waitlist/lib/copy";
import { getLaunchMode } from "@/waitlist/lib/launch";
import { LaunchModeProvider } from "@/waitlist/components/LaunchModeProvider";
import type { ReactNode } from "react";
import "./waitlist.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  // Sem NEXT_PUBLIC_BASE_URL (situação actual) o metadataBase fica vazio e o
  // Next usa o domínio do deploy. Evita new URL("") com a variável vazia.
  ...(baseUrl ? { metadataBase: new URL(baseUrl) } : {}),
  title: copy.meta.title,
  description: copy.meta.description,
  // TODO(logo): gerar imagem Open Graph 1200x630 a partir do SVG definitivo (PRD 3.4)
  openGraph: {
    title: copy.meta.title,
    description: copy.meta.description,
    type: "website",
    locale: "pt_AO",
  },
  icons: {
    icon: [
      { url: "/waitlist/favicon.ico", sizes: "any" },
      { url: "/waitlist/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/waitlist/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: copy.meta.title,
    description: copy.meta.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

/**
 * The waitlist is its OWN root layout (its own <html>, fonts and stylesheet), apart from the language-prefixed site. It is rendered per request:
 * the site's Content-Security-Policy carries a nonce that Next only puts on the scripts of pages rendered on demand.
 */
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  const launchMode = getLaunchMode();
  return (
    <html lang="pt-AO" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-brand-black font-sans text-brand-white">
        <LaunchModeProvider initialMode={launchMode}>{children}</LaunchModeProvider>
      </body>
    </html>
  );
}
