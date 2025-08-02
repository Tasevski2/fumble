'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/intro');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className='min-h-screen bg-primary flex items-center justify-center safe-area-inset-top safe-area-inset-bottom'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='text-center'
        onClick={() => router.push('/intro')}
      >
        <div className='relative'>
          <div className='mx-auto mb-8 flex items-center justify-center'>
            <Image src='/logo.png' alt='Fumble Logo' width={112} height={112} className='w-28 h-28' priority />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
