import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import { DEFAULT_THEME, themeInitializationScript } from "@/lib/theme";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "Pet Namora | Encontre um par para seu cachorro",
  description:
    "Encontre um par para seu cachorro no Pet Namora. Busque por raça e cidade, conheça os perfis e converse com outras famílias para combinar um encontro.",
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
