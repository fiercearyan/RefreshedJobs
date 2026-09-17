import type { Metadata } from "next";
import "./globals.css";
import "./openroles-theme.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "OpenRoles",
  description:
    "Live LinkedIn backend / platform roles in India, matched to a distributed-systems engineer (~4 yrs).",
};

// Runs before paint to apply the saved themes (dark is default) with no flash.
// `theme` drives the legacy .light class (profile / sign-in); `openroles.theme`
// drives data-theme, which the board UI reads.
const themeScript = `(function(){try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.add('light');}document.documentElement.setAttribute('data-theme',localStorage.getItem('openroles.theme')||'dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
