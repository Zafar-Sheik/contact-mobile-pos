import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Logo from "@/public/images/logo1.png";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Contact Mobile Point Of Sale",
  description: "Built By Contact Online Solutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}

        {/* Branding logo */}
        <div className="fixed bottom-20 right-4 z-50">
          <div className="bg-white p-2 rounded-lg shadow-lg">
            <Image
              src={Logo}
              alt="Contact Online Solutions Logo"
              width={80}
              height={40}
              className="h-auto"
              priority={false}
            />
          </div>
        </div>
      </body>
    </html>
  );
}
