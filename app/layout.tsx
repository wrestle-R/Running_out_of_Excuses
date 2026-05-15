import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import CopyAttribution from "@/components/common/CopyAttribution";

export const metadata: Metadata = {
  title: "Running Out of Excuses",
  description: "Road to marathon running journal",
  icons: {
    icon: "/runny-white-nobg.png",
    shortcut: "/runny-white-nobg.png",
    apple: "/runny-white-nobg.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CopyAttribution />
        {children}
      </body>
    </html>
  );
}
