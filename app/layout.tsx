import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import MainLayout from '@/components/MainLayout';

const SITE_URL = "https://thrivv.dev";
const SITE_NAME = "Thrivv Technologies";
const SITE_DESCRIPTION =
  "The fitness app your gym deploys. Daily check-ins, AI workouts, wearables, and rewards \u2014 one Health Score that ranks you on your gym\u2019s weekly leaderboard.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} \u2014 Train. Track. Climb the leaderboard.`,
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
    title: `${SITE_NAME} \u2014 Train. Track. Climb the leaderboard.`,
    description: SITE_DESCRIPTION,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} \u2014 Train. Track. Climb the leaderboard.`,
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
        "B2B fitness retention platform. Boutique gyms deploy Thrivv to drive member engagement, retention, and rewards.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // Inline schema.org JSON-LD. Inert text node — does not execute as JS.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="antialiased">
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}
