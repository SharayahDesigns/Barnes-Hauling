import type { Metadata, Viewport } from "next";
import { Anton, Barlow, Barlow_Condensed, Geist_Mono } from "next/font/google";

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
        url: "/images/barnes-brand-mark.png",
        width: 800,
        height: 497,
        alt: "Barnes Hauling and Disposal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${businessConfig.identity.name.value} | Hauling & Dumpster Rentals`,
    description:
      "Clear service paths for hauling projects and dumpster rentals, with confirmed rates and restrictions up front.",
    images: ["/images/barnes-brand-mark.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#173f35",
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
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
