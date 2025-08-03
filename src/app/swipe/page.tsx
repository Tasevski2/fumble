'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletIcon, RotateCcw } from 'lucide-react';
import { SwipableCard } from '@/components/SwipableCard';
import { useAppStore } from '@/state/useAppStore';
import Image from 'next/image';

export default function SwipePage() {
  const router = useRouter();
  const {
    // tokens,
    getTrashTokens,
    setTokens,
    currentTokenIndex,
    nextToken,
    swipeToken,
    dumpTokens,
    keepTokens,
    trashThreshold,
    resetAppState,
  } = useAppStore();
  const tokens = getTrashTokens();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Remove mock token generation - only use real scanned tokens

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentToken = tokens[currentIndex];
    if (!currentToken) return;

    const action = direction === 'left' ? 'dump' : 'keep';
    swipeToken(currentToken.id, action);

    // Move to next token
    if (currentIndex < tokens.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All tokens swiped, go to summary
      router.push('/summary');
    }
  };

  const handleStartOver = () => {
    resetAppState();
    router.push('/enter');
  };

  const totalJudged = dumpTokens.length + keepTokens.length;
  const pendingCount = tokens.length - totalJudged;

  if (tokens.length === 0) {
    return (
      <div className='min-h-screen bg-primary flex flex-col safe-area-inset-top safe-area-inset-bottom'>
        {/* Header */}
        <div className='flex items-center justify-between p-4'>
          <button
            onClick={() => router.back()}
            className='p-2 -ml-2 rounded-full hover:bg-black/10 transition-colors'
          >
            <RotateCcw className='w-6 h-6' />
          </button>
          <Image
            src='/bell.png'
            alt='Bell'
            width={32}
            height={32}
            className='w-8 h-8'
          />
          <button className='p-2 -mr-2 rounded-full hover:bg-black/10 transition-colors'>
            <WalletIcon className='w-6 h-6' />
          </button>
        </div>

        {/* Empty state message */}
        <div className='flex-1 flex items-center justify-center px-6'>
          <div className='bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 aspect-[5/6] w-full max-w-sm flex items-center justify-center'>
            <div className='text-center'>
              <div className='text-6xl mb-6'>🏛️</div>
              <h2 className='text-xl font-bold text-gray-900 mb-4'>
                No tokens to dump
              </h2>
              <p className='text-gray-600 text-center leading-relaxed'>
                Your wallet is a museum of good decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Footer placeholder */}
        <div className='px-6 py-8 bg-primary-light'>
          <div className='text-center'>
            <p className='text-primary-foreground/60 text-sm'>
              Scan more wallets to find tokens worth dumping
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentToken = tokens[currentIndex];

  return (
    <div className='min-h-screen bg-primary flex flex-col safe-area-inset-top safe-area-inset-bottom'>
      {/* Header */}
      <div className='flex items-center justify-between p-4'>
        <button
          onClick={handleStartOver}
          className='p-2 -ml-2 rounded-full hover:bg-black/10 transition-colors'
        >
          <RotateCcw className='w-6 h-6' />
        </button>
        <Image
          src='/bell.png'
          alt='Bell'
          width={32}
          height={32}
          className='w-8 h-8'
        />
        <button className='p-2 -mr-2 rounded-full hover:bg-black/10 transition-colors'>
          <WalletIcon className='w-6 h-6' />
        </button>
      </div>

      {/* Progress Bar */}
      <div className='px-6 mb-4'>
        <div className='text-center mb-2'>
          <span className='text-primary-foreground text-sm'>
            {totalJudged}/{tokens.length} bags judged • {pendingCount} purges
            pending.
          </span>
        </div>
        <div className='w-full bg-white/20 rounded-full h-1'>
          <div
            className='bg-white h-1 rounded-full transition-all duration-300'
            style={{ width: `${(totalJudged / tokens.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card Stack */}
      <div className='flex-1 flex items-center justify-center px-[8vw] w-full'>
        <AnimatePresence mode='wait'>
          {currentToken && (
            <motion.div
              key={currentToken.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='w-full'
            >
              <SwipableCard token={currentToken} onSwipe={handleSwipe} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer - Swipe Indicators */}
      <div className='px-6 py-8 bg-primary-light'>
        <div className='flex justify-between items-center max-w-sm mx-auto'>
          {/* DUMP Indicator */}
          <div className='flex flex-col items-center gap-2 rounded-full px-4'>
            <div className='w-14 h-14 bg-white rounded-full flex items-center justify-center'>
              <span className='text-3xl'>👈</span>
            </div>
            <span className='text-primary-foreground font-medium text-lg'>
              DUMP
            </span>
          </div>

          {/* KEEP Indicator */}
          <div className='flex flex-col items-center gap-2 rounded-full px-4'>
            <div className='w-14 h-14 bg-white rounded-full flex items-center justify-center'>
              <span className='text-3xl'>👉</span>
            </div>
            <span className='text-primary-foreground font-medium text-lg'>
              KEEP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
