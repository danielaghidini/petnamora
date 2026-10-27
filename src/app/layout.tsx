import type { Metadata } from "next";
import { DEFAULT_THEME, themeInitializationScript } from "@/lib/theme";
import "./globals.css";
export const metadata: Metadata = {
  title: "Pet Namora — Um namorinho de quatro patas",
  description:
    "Um namorinho pro seu cachorro! Conheça os crushes de quatro patas, mande um coração e combine o encontro com a outra família no Pet Namora.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script
          id="petnamora-theme"
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
