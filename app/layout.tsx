import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uttarwar Art",
  description: "Art portfolio — sections assemble from the outside in",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
