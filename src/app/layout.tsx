import { Providers } from "@/components/providers";
import "@/styles/global.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0091D3",
  initialScale: 1.0,
  maximumScale: 1.0,
  minimumScale: 1.0,
  userScalable: false,
  width: "device-width",
};

export const metadata: Metadata = {
  title: {
    default: "BookRoom",
    template: "%s",
  },
  keywords: ["booking", "room"],
  description: "Easy way to book rooms in your company",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${inter.className} bg-stone-100`}>
        <Providers>
          <Toaster
            position="bottom-right"
            toastOptions={{ success: { duration: 8000 } }}
          />
          {children}
        </Providers>
      </body>
    </html>
  );
}
