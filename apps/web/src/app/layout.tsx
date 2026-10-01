import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Hover delay of every tooltip: Base UI waits 600 ms by default, which feels slow on the icon actions. */
const TOOLTIP_DELAY_MS = 150;

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenTax IT",
  description: "Open source management tool for Italian flat-rate VAT holders",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider delay={TOOLTIP_DELAY_MS}>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
