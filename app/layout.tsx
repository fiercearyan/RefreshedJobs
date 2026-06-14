import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backend & Platform Job Board — India",
  description:
    "Live LinkedIn backend / platform roles in India, matched to a distributed-systems engineer (~4 yrs).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
