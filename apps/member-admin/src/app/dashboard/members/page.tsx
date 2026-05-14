'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Members page redirects to customers — same concept
export default function MembersPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/customers'); }, [router]);
  return null;
}
