import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import MainLayout from '@/components/MainLayout';
import { headers } from 'next/headers';
import { isNativeApp } from '@/lib/mobile-app';
import { getServerSessionIdentity } from '@/lib/server-session-identity';

// The shared layout contains a request-bound identity. It must never be cached
// as a static document and reused for another signed-in member or gym operator.
export const dynamic = 'force-dynamic';

const SITE_URL = "https://thrivv.dev";
const SITE_NAME = "Thrivv Technologies";
const SITE_DESCRIPTION =
  "Gym workouts, daily habits, nutrition tracking and member rewards. Connect WHOOP for Health Scores, or verify manual workouts to earn spendable points.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} \u2014 Show up. Make it count.`,
    template: `%s \u00B7 ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} \u2014 Show up. Make it count.`,
    description: SITE_DESCRIPTION,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} \u2014 Show up. Make it count.`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  category: "fitness",
};

// Structured data so Google can render "Thrivv Technologies" as the site
// name in the SERP knowledge card. Independent of the meta tags above —
// Google reads schema.org WebSite + Organization separately.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}#organization` },
      inLanguage: "en-GB",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
      name: SITE_NAME,
      alternateName: "Thrivv",
      url: SITE_URL,
      description:
        "Gym engagement platform for member activity, verified workouts, nutrition tracking and rewards.",
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const serverIdentity = await getServerSessionIdentity();
  return (
    <html lang="en" data-native-app={isNativeApp((await headers()).get('user-agent')) ? 'true' : undefined}>
      <head>
        <script
          type="application/ld+json"
          // Inline schema.org JSON-LD. Inert text node — does not execute as JS.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="antialiased">
        <MainLayout serverIdentity={serverIdentity}>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}
