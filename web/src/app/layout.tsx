import "./globals.css"
import type { Metadata } from "next"
import { Navigation } from "@/components/ui/navigation"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { SettingsProvider } from "@/lib/contexts/settings-context"
import { ToastProvider } from "@/lib/toast"
import { LearningLangProvider } from "@/lib/contexts/learning-lang-context"
import { GoogleOAuthProvider } from "@react-oauth/google"

export const metadata: Metadata = {
  title: "MemoMap",
  description: "Language learning · Notes · Schedule",
  icons: "/favicon.svg",
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {GOOGLE_CLIENT_ID ? (
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
              <SettingsProvider>
                <LearningLangProvider>
                  <Navigation />
                  {children}
                  <ToastProvider />
                </LearningLangProvider>
              </SettingsProvider>
            </AuthProvider>
          </GoogleOAuthProvider>
        ) : (
          <AuthProvider>
            <SettingsProvider>
              <LearningLangProvider>
                <Navigation />
                {children}
                <ToastProvider />
              </LearningLangProvider>
            </SettingsProvider>
          </AuthProvider>
        )}
      </body>
    </html>
  )
}
