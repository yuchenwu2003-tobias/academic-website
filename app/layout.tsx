import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tobias · 个人空间",
  description: "Tobias 的文字、旅行与研究收藏，使用账号同步到云端。",
  icons: {
    icon: "/assets/favicon.svg",
    shortcut: "/assets/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
