'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Preparing workspace');

  // Simulate loading progress
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 15;
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [progress]);

  // Change loading text periodically
  useEffect(() => {
    const texts = [
      'Preparing workspace',
      'Loading documents',
      'Connecting members',
      'Almost there',
    ];

    const interval = setInterval(() => {
      setLoadingText(texts[Math.floor(Math.random() * texts.length)]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-background to-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-8 w-[400px] px-8 py-12 rounded-2xl bg-white/5 backdrop-blur-sm shadow-lg border border-border/30">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-primary/10 animate-pulse blur-xl" />
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={80}
            height={80}
            className="relative animate-bounce duration-1000"
          />
        </div>

        <div className="space-y-6 w-full">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium text-foreground">
              {loadingText}...
            </p>
          </div>

          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Loading workspace</span>
            <span>{Math.min(Math.round(progress), 100)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/40 animate-pulse rounded-full"
                style={{
                  animationDelay: `${i * 200}ms`,
                  animationDuration: '1.5s',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground/70 mt-8 animate-pulse">
        Setting up your collaborative environment
      </p>
    </div>
  );
}
