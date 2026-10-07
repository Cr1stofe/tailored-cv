import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar/Navbar";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Tailored CV | Never invent. Only reframe.",
  description:
    "Adaptação inteligente de currículos com inteligência artificial e estrita fidelidade aos fatos profissionais.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Navbar />
        <main>{children}</main>
        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: "#101622",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              color: "#f1f5f9",
            },
          }}
        />
      </body>
    </html>
  );
}
