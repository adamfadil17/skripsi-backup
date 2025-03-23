'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export default function AcceptInvitePage({
  params,
}: {
  params: { id: string };
}) {
  const [message, setMessage] = useState('Checking user status...');
  const router = useRouter();

  useEffect(() => {
    async function handleInvitation() {
      const user = await getCurrentUser();
      if (!user) {
        // Simpan inviteId sebelum redirect ke halaman login
        localStorage.setItem('inviteId', params.id);
        router.push('/');
        return;
      }

      try {
        await axios.post(`/api/invite/${params.id}/accept`);
        router.push('/dashboard');
      } catch (error: any) {
        setMessage(
          error.response?.data?.message || 'Failed to accept invitation.'
        );
      }
    }

    handleInvitation();
  }, [params.id, router]);

  return <p>{message}</p>;
}
