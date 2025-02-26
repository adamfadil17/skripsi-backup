'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User } from '@prisma/client';
import { Wand } from 'lucide-react';

interface BannerProps {
  currentUser: User;
}
const Banner = ({ currentUser }: BannerProps) => {
  return (
    <Card
      className="relative overflow-hidden border-0"
      style={{
        backgroundImage: `url('/images/bannerdashboard.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="relative z-10 flex min-h-[160px] items-center justify-between p-12 md:min-h-[240px]">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Hi, {currentUser?.name || 'Guest'}
          </h1>
          <p className="mb-4 text-md text-white/80">
            A seamless and inspiring space designed to simplify note-taking
            while fostering creativity and collaboration for all.
          </p>
          <Button
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20"
          >
            <Wand className="mr-2 h-6 w-6" />
            Effortless Note-Taking Made Simple
          </Button>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-gray-800 to-primary opacity-10" />
    </Card>
  );
};

export default Banner;
