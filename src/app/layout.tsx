import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KalmKaya",
  description: "Sistema de registro de servicios",
  openGraph: {
    title: "KalmKaya",
    description: "Sistema de registro de servicios",
    url: "https://kalmkaya.vercel.app",
    siteName: "KalmKaya",
    images: [
      {
        url: "https://kalmkaya.vercel.app/icon.png",
        width: 512,
        height: 512,
        alt: "KalmKaya Salón",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "KalmKaya",
    description: "Sistema de registro de servicios",
    images: ["https://kalmkaya.vercel.app/icon.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geist.className} antialiased bg-gray-50 dark:bg-stone-950 min-h-screen`}>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
