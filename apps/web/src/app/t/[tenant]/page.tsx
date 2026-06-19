import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function TenantLanding({ params }: { params: { tenant: string } }) {
  // Middleware already set the cookie; redirect to main landing
  // (The data-theme on html is set from cookie in layout.tsx)
  redirect('/');
}
