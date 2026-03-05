import type { Metadata } from "next";
import { Toaster } from "@telecom/ui";
import "@telecom/tokens/tokens.css";
import "@telecom/ui/styles.css";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "Portal de Servicios - Servicoop",
  description: "Portal de servicios para telecomunicaciones y automatismos"
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <div className="root">
            {children}
            <Toaster />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
