import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NolleDansa – Träna nolledanser på LTH",
  description:
    "Samla, dela och träna nolledanser från LTH:s sektioner. Välj delar och loopa dem för effektiv träning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900 flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-5 text-sm text-gray-500">
            Har du problem? Kontakta Vincent Lindell på Messenger eller via mail{" "}
            <a
              href="mailto:vincentlindell1@gmail.com"
              className="font-medium text-purple-700 hover:text-purple-800 transition-colors"
            >
              vincentlindell1@gmail.com
            </a>
            .
          </div>
        </footer>
      </body>
    </html>
  );
}
