import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { I18nProvider } from '../components/I18nProvider';

export const metadata: Metadata = {
  title: 'Loan Wizard — Instant Offer',
  description: 'Get a personalised loan offer in under 2 minutes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const tenant = cookieStore.get('tenant')?.value ?? 'alpha';

  return (
    <html lang="en" data-theme={tenant}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
