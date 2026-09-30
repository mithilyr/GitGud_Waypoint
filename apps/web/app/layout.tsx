import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { ToastHost } from "@/components/ui";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], weight: ["400", "500", "600"] });

const notoSi = Noto_Sans_Sinhala({ variable: "--font-noto-si", subsets: ["sinhala"], weight: ["400", "500", "600", "700"] });
const notoTa = Noto_Sans_Tamil({ variable: "--font-noto-ta", subsets: ["tamil"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Waypoint Delivery System",
  description: "One operation, one system. Order, plan, load, deliver and receipt for Waypoint Group.",
  applicationName: "Waypoint",
  appleWebApp: { capable: true, title: "Waypoint", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#131211" },
  ],
};

// Sets the theme before first paint so there is no flash between Daylight and Dark.
const themeScript = `try{var t=localStorage.getItem('wp_theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t;var z=localStorage.getItem('wp_text');if(z)document.documentElement.dataset.textSize=z;var d=localStorage.getItem('wp_density');if(d)document.documentElement.dataset.density=d}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${notoSi.variable} ${notoTa.variable} antialiased`}>
        <AuthProvider>
          <LanguageProvider>
            {children}
            <ToastHost />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
