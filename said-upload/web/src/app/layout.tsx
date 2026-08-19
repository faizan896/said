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
        {/* The room. Everything below sits on paper, on a table, inside it. */}
        <SceneBackdrop />
        <Providers>
          {/* A band of the street shows above the paper, and slivers of it
              down either side — most of all on phones, where the sheet is
              otherwise wide enough to hide the whole scene. */}
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-2 pt-36 sm:px-6 sm:pt-10">
            <div className="sheet flex min-h-[100svh] flex-1 flex-col rounded-t-lg">
              <Header />
              <main className="flex-1 pb-24 sm:pb-8">{children}</main>
            </div>
          </div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
