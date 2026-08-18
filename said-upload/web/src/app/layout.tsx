import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/nav/header";
import { BottomNav } from "@/components/nav/bottom-nav";

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
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <Providers>
          <Header />
          <main className="flex-1 pb-20 sm:pb-0">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
