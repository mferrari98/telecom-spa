import type { Metadata } from "next";
import { Toaster } from "@telecom/ui";
import { primeInternalDirectoryCache } from "@/lib/internal-directory-cache";
import "@telecom/tokens/tokens.css";
import "@telecom/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal de Servicios - Servicoop",
  description: "Portal de servicios para telecomunicaciones y automatismos"
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const directoryCache = await primeInternalDirectoryCache();
  const directoryBootstrapJson = JSON.stringify(directoryCache.entries).replace(
    /</g,
    "\\u003c"
  );

  return (
    <html lang="es">
      <body>
        <div className="root">
          <script
            id="internal-directory-bootstrap"
            type="application/json"
            dangerouslySetInnerHTML={{ __html: directoryBootstrapJson }}
          />
          {children}
          <Toaster />
        </div>
      </body>
    </html>
  );
}
