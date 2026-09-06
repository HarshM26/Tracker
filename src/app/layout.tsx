import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Activity Tracker",
  description: "Shared task tracker for the team.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
