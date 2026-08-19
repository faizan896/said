import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/nav/header";
import { BottomNav } from "@/components/nav/bottom-nav";
import { SceneBackdrop } from "@/components/scene/scene-backdrop";

// Absolute URLs are required for share cards. Vercel exposes the production
// hostname at build time, so nothing has to be hardcoded per deployment.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const description =
  "A public, on-chain record of the things you said you'd do. Say it, let people witness it, and either keep your word or don't — it stays on the record either way.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "said — you said you'd do it.",
  description,
  openGraph: {
    type: "website",
    siteName: "said",
    title: "said — you said you'd do it.",
    description,
    url: "/",
  },
  // Without an explicit card type X falls back to the small square preview,
  // which wastes the painting.
  twitter: {
    card: "summary_large_image",
    title: "said — you said you'd do it.",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col text-ink">
        {/* The painting sits behind everything; each page decides whether it
            needs a surface to sit on. The landing deliberately doesn't. */}
        <SceneBackdrop />
        <Providers>
          <div className="relative z-10 flex flex-1 flex-col">
            <Header />
            <main className="flex-1 pb-28 sm:pb-10">{children}</main>
          </div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
