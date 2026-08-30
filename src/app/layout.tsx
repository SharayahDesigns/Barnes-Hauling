import type { Metadata, Viewport } from "next";
import { Anton, Barlow, Barlow_Condensed, Geist_Mono } from "next/font/google";

import { AuthRedirectListener } from "@/components/auth/auth-redirect-listener";
import { HideOnAdmin } from "@/components/site/hide-on-admin";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { businessConfig } from "@/config/business";
import { getSiteUrl } from "@/lib/site-url";

import "./globals.scss";

const anton = Anton({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-heading",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const barlow = Barlow({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: `${businessConfig.identity.name.value} | Hauling & Dumpster Rentals`,
    template: `%s | ${businessConfig.identity.name.value}`,
  },
  description:
    "Plan hauling, junk removal, and dumpster rental service with Barnes Hauling and Disposal. Review confirmed container rates, terms, and project paths.",
  openGraph: {
    type: "website",
    siteName: businessConfig.identity.name.value,
    title: `${businessConfig.identity.name.value} | Hauling & Dumpster Rentals`,
    description:
      "Clear service paths for hauling projects and dumpster rentals, with confirmed rates and restrictions up front.",
    images: [
      {
        url: "/images/OG-barnesImage.jpg",
        width: 1731,
        height: 909,
        alt: `${businessConfig.identity.name.value} | Hauling & Dumpster Rentals`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${businessConfig.identity.name.value} | Hauling & Dumpster Rentals`,
    description:
      "Clear service paths for hauling projects and dumpster rentals, with confirmed rates and restrictions up front.",
    images: ["/images/OG-barnesImage.jpg"],
  },
  icons: {
    icon: [
      { url: "/images/favicon.ico", sizes: "any" },
      { url: "/images/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/images/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    shortcut: ["/images/favicon.ico"],
    apple: [
      { url: "/images/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0b0c0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${barlowCondensed.variable} ${barlow.variable} ${geistMono.variable}`}
    >
      <body>
        <AuthRedirectListener />
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <HideOnAdmin>
          <SiteHeader />
        </HideOnAdmin>
        <main id="main-content">{children}</main>
        <HideOnAdmin>
          <SiteFooter />
        </HideOnAdmin>
      </body>
    </html>
  );
}
