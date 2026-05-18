import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "今日のデートスポット",
  description: "二人で行きたいデートスポットを紹介するサイト",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <NavBar />
        <main style={{ paddingBottom: 0 }}>{children}</main>
        <footer className="text-center py-8 text-xs tracking-widest"
          style={{ color: "var(--muted)", borderTop: "1px solid var(--border)" }}>
          <span className="font-mincho">© 2026 今日のデートスポット</span>
        </footer>
      </body>
    </html>
  );
}