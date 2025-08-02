'use client';

import { useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Token } from '@/types';
import {
  formatBalance,
  formatPrice,
  formatChange,
  getRandomQuip,
} from '@/utils/mock';

interface SwipableCardProps {
  token: Token;
  onSwipe: (direction: 'left' | 'right') => void;
  onDump: () => void;
  onKeep: () => void;
}

export function SwipableCard({
  token,
  onSwipe,
  onDump,
  onKeep,
}: SwipableCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Create transform hooks for swipe indicators outside of conditional rendering
  const dumpOpacity = useTransform(x, [-100, 0], [1, 0]);
  const keepOpacity = useTransform(x, [0, 100], [0, 1]);

  const handlePanEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    setIsDragging(false);
    const threshold = 75;
    const swipeVelocity = Math.abs(info.velocity.x);

    if (
      info.offset.x > threshold ||
      (info.offset.x > 25 && swipeVelocity > 500)
    ) {
      onSwipe('right');
      onKeep();
    } else if (
      info.offset.x < -threshold ||
      (info.offset.x < -25 && swipeVelocity > 500)
    ) {
      onSwipe('left');
      onDump();
    }
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-success';
    if (change < -50) return 'text-destructive';
    return 'text-orange-500';
  };

  const quip = getRandomQuip();

  return (
    <motion.div
      className='relative w-full max-w-md mx-auto cursor-grab active:cursor-grabbing origin-bottom'
      style={{ x, rotate, opacity }}
      drag='x'
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.1}
      onPanStart={() => setIsDragging(true)}
      onPanEnd={handlePanEnd}
      whileDrag={{
        scale: 1.02,
        transition: { duration: 0.1 },
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
    >
      <div className='bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 aspect-[5/6] w-full max-w-sm'>
        {/* Token Header */}
        <div className='mb-6'>
          {/* Token Logo and Name on same line */}
          <div className='flex items-center gap-4 mb-4'>
            <div className='w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0'>
              {token.logoUrl ? (
                <img
                  src={token.logoUrl}
                  alt={token.symbol}
                  className='w-10 h-10 rounded-full'
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className='text-xl font-bold text-gray-600'>
                  {token.symbol.slice(0, 2)}
                </span>
              )}
            </div>
            <div className='flex-1'>
              <h3 className='font-bold text-2xl text-gray-900 mb-1'>
                {token.symbol}
              </h3>
            </div>
          </div>

          {/* Price and Change */}
          <div className='text-center mb-4'>
            <p className='font-bold text-3xl text-gray-900 mb-1'>
              ${token.balanceUsd.toFixed(2)}
            </p>
            <p
              className={`text-base font-semibold ${getChangeColor(
                token.change24h
              )}`}
            >
              {formatChange(token.change24h)}
            </p>
          </div>
        </div>

        {/* Quip */}
        <div className='bg-gray-50 rounded-2xl p-4 mb-6'>
          <p className='text-gray-700 text-center italic text-base'>
            &quot;{quip}&quot;
          </p>
        </div>

        {/* Token Details */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='text-center'>
            <p className='text-sm text-gray-500 uppercase tracking-wide mb-2'>
              Balance
            </p>
            <p className='font-mono text-xl font-semibold'>
              {formatBalance(token.balance)}
            </p>
          </div>
          <div className='text-center'>
            <p className='text-sm text-gray-500 uppercase tracking-wide mb-2'>
              Price
            </p>
            <p className='font-mono text-xl font-semibold'>
              {formatPrice(token.price)}
            </p>
          </div>
        </div>
      </div>

      {/* Swipe Indicators */}
      {isDragging && (
        <>
          <motion.div
            className='absolute inset-0 bg-destructive/20 rounded-2xl flex items-center justify-center'
            style={{ opacity: dumpOpacity }}
          >
            <span className='text-destructive font-bold text-2xl'>DUMP</span>
          </motion.div>
          <motion.div
            className='absolute inset-0 bg-success/20 rounded-2xl flex items-center justify-center'
            style={{ opacity: keepOpacity }}
          >
            <span className='text-success font-bold text-2xl'>KEEP</span>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
