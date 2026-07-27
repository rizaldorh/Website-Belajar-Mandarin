import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import AdminForm from '@/components/admin/AdminForm';

export default async function AdminPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim());

  if (!user || !adminEmails.includes(user.email ?? '')) {
    redirect('/');
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Admin — Import Bab</h1>
      <AdminForm />
    </div>
  );
}
