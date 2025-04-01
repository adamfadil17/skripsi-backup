'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useSession } from 'next-auth/react';

export default function AcceptInvitePage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session, status } = useSession();
  const [message, setMessage] = useState('Checking user status...');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Tunggu NextAuth selesai memeriksa sesi

    async function handleInvitation() {
      try {
        if (!session?.user) {
          // Simpan inviteId sebelum redirect ke halaman login
          sessionStorage.setItem('inviteId', params.id);
          router.push('/');
          return;
        }

        // Jika user sudah login, langsung proses invitation
        const response = await axios.post(`/api/invite/${params.id}/accept`);

        if (response.status === 200) {
          router.push('/dashboard');
        }
      } catch (error: any) {
        // Menangani status 401 dari API (Unauthorized)
        if (error.response?.status === 401) {
          // Redirect ke halaman login jika status 401 (Unauthorized)
          sessionStorage.setItem('inviteId', params.id); // Simpan inviteId untuk redirect setelah login
          router.push('/');
          return;
        }

        // Menampilkan pesan error lainnya jika bukan 401
        setMessage(
          error.response?.data?.message || 'Failed to accept invitation.'
        );
      } finally {
        setLoading(false);
      }
    }

    handleInvitation();
  }, [params.id, router, session, status]);

  if (status === 'loading' || loading) return <p>Loading...</p>;

  return <p>{message}</p>;
}
