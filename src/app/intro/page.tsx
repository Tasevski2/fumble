'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function IntroPage() {
  const router = useRouter();
  const [showAfter, setShowAfter] = useState(false);

  const features = [
    {
      text: "You can't fix your marriage.",
      icon: X,
      variant: 'error' as const,
    },
    {
      text: 'But you can fix your wallet.',
      icon: Check,
      variant: 'success' as const,
    },
    { text: 'Swipe.', icon: '👈' },
    { text: 'Clean.', icon: '✨' },
    { text: 'Ascend.', icon: '🚀' },
  ];

  return (
    <div className='h-screen bg-primary flex flex-col safe-area-inset-top safe-area-inset-bottom overflow-hidden relative'>
      {/* Header */}
      <div className='flex items-center justify-center p-4'>
        <img src='/bell.png' alt='Bell' className='w-8 h-8' />
      </div>

      {/* Feature List Card */}
      <div className='p-6'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='w-full max-w-sm mx-auto'
        >
          <div className='bg-white rounded-2xl p-6 shadow-lg'>
            <div className='space-y-3'>
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className='flex items-center gap-3'
                >
                  {typeof feature.icon === 'string' ? (
                    <span className='text-2xl'>{feature.icon}</span>
                  ) : (
                    <feature.icon
                      className={`w-6 h-6 ${
                        feature.variant === 'error'
                          ? 'text-destructive'
                          : feature.variant === 'success'
                          ? 'text-success'
                          : 'text-gray-600'
                      }`}
                    />
                  )}
                  <span
                    className={`text-lg ${
                      feature.variant === 'error'
                        ? 'text-destructive'
                        : feature.variant === 'success'
                        ? 'text-success'
                        : 'text-gray-800'
                    }`}
                  >
                    {feature.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Before/After Toggle */}
      <div className='px-6'>
        <div className='bg-gray-100 rounded-full p-1 flex max-w-sm mx-auto'>
          <button
            onClick={() => setShowAfter(false)}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
              !showAfter ? 'bg-white text-black shadow-sm' : 'text-gray-600'
            }`}
          >
            BEFORE
          </button>
          <button
            onClick={() => setShowAfter(true)}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
              showAfter ? 'bg-white text-black shadow-sm' : 'text-gray-600'
            }`}
          >
            AFTER
          </button>
        </div>
      </div>

      {/* Phone Mock - Centered and cropped to show upper 50% */}
      <div className='flex-1 flex justify-center px-6 mt-[5vh]'>
        <motion.div
          key={showAfter ? 'after' : 'before'}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className='relative'
        >
          {/* Phone container - extends below visible area */}
          <div className='w-48 h-80 bg-gray-900 rounded-t-3xl p-2 shadow-xl overflow-hidden'>
            <div className='w-full h-96 bg-white rounded-2xl overflow-hidden'>
              {showAfter ? (
                <div className='p-4'>
                  <div className='text-center py-8'>
                    <div className='text-4xl mb-2'>✨</div>
                    <p className='text-lg font-bold'>PEACE</p>
                    <p className='text-sm text-gray-600 mt-2'>
                      Only valuable tokens remain
                    </p>
                  </div>
                </div>
              ) : (
                <div className='p-4'>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between p-2 bg-gray-50 rounded'>
                      <span className='text-xs'>SASSY1</span>
                      <span className='text-xs text-gray-500'>$0.01</span>
                    </div>
                    <div className='flex items-center justify-between p-2 bg-gray-50 rounded'>
                      <span className='text-xs'>SHDHD</span>
                      <span className='text-xs text-gray-500'>-40.7%</span>
                    </div>
                    <div className='flex items-center justify-between p-2 bg-gray-50 rounded'>
                      <span className='text-xs'>SPLIT</span>
                      <span className='text-xs text-gray-500'>$2.17</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className='absolute bottom-0 left-0 transform text-center w-full bg-primary-light px-6 py-8'>
        {/* CTA Button */}
        <Button
          onClick={() => router.push('/enter')}
          className='w-full bg-gray-900 hover:bg-gray-800 text-white h-14 rounded-full text-lg font-medium'
        >
          START THE CLEANSE
        </Button>
        <p className='text-sm text-gray-800 pt-4'>
          Built on 1inch Fusion and bad decisions.
        </p>
      </div>
    </div>
  );
}
