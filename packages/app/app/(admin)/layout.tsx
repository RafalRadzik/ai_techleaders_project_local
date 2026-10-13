import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./admin.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Admin · DevMentor",
    template: "%s · DevMentor Admin",
  },
  robots: { index: false, follow: false },
};

/** Root layout for the backend (admin) area. Styled with shadcn-ui from @devmentor/ui. */
export default function AdminRootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full font-sans antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
