import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/nav/header";
import { BottomNav } from "@/components/nav/bottom-nav";
import { SceneBackdrop } from "@/components/scene/scene-backdrop";

export const metadata: Metadata = {
  title: "said — you said you'd do it.",
  description:
    "A public, on-chain record of the things you said you'd do. Put it on the record on Monad.",
  openGraph: {
    title: "said",
    description: "you said you'd do it.",
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
          <Header />
          <main className="flex-1 pb-28 sm:pb-10">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
