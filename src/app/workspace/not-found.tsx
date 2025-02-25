import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto flex max-w-[700px] flex-col items-center justify-center text-center">
        {/* Error Illustration */}
        <Image
          src="/images/404.svg"
          alt="404 Error Illustration"
          width={400}
          height={400}
          priority
          className="mb-8 select-none"
        />

        {/* Error Content */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter text-gray-900 dark:text-gray-50 sm:text-5xl">
            404
          </h1>
          <h2 className="text-xl font-medium tracking-tight text-gray-700 dark:text-gray-200 sm:text-2xl">
            The page you are looking for does not exist
          </h2>
        </div>

        {/* Action Button */}
        <Button asChild className="mt-8 h-11 px-6 text-base" variant="default">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
