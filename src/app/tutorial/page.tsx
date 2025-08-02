'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  motion,
  AnimatePresence,
  PanInfo,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import { ArrowLeft, WalletIcon } from 'lucide-react';

const tutorialScreens = [
  {
    id: 'left',
    title: 'Swipe Left to purge',
    description:
      "Left swipe = dump this bag. Just like you should've done months ago.",
    emoji: '👈',
    action: 'Sell to Stables.🤑',
    bgColor: 'bg-white',
  },
  {
    id: 'right',
    title: 'Swipe Right to Hold',
    description: 'Hope is a knife. Swipe carefully.',
    emoji: '👉',
    action: 'Diamond Hands Activated.💎',
    bgColor: 'bg-white',
  },
];

export default function TutorialPage() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  const nextScreen = () => {
    if (currentScreen < tutorialScreens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      router.push('/swipe');
    }
  };

  const prevScreen = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    } else {
      router.back();
    }
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 75;
    const swipeVelocity = Math.abs(info.velocity.x);

    // First card (Swipe Left tutorial) - only allow left swipes
    if (currentScreen === 0) {
      if (
        info.offset.x < -threshold ||
        (info.offset.x < -25 && swipeVelocity > 500)
      ) {
        // Swiped left - go to next screen
        nextScreen();
      }
      return;
    }

    // Second card (Swipe Right tutorial) - only allow right swipes
    if (currentScreen === 1) {
      if (
        info.offset.x > threshold ||
        (info.offset.x > 25 && swipeVelocity > 500)
      ) {
        // Swiped right - go to swipe page
        router.push('/swipe');
      }
      return;
    }
  };

  const currentTutorial = tutorialScreens[currentScreen];

  return (
    <div className='min-h-screen bg-primary flex flex-col safe-area-inset-top safe-area-inset-bottom'>
      {/* Header */}
      <div className='flex items-center justify-between p-4'>
        <button
          onClick={prevScreen}
          className='p-2 -ml-2 rounded-full hover:bg-black/10 transition-colors'
        >
          <ArrowLeft className='w-6 h-6' />
        </button>
        <img src='/bell.png' alt='Bell' className='w-8 h-8' />
        <button className='p-2 -mr-2 rounded-full hover:bg-black/10 transition-colors'>
          <WalletIcon className='w-6 h-6' />
        </button>
      </div>

      {/* Content */}
      <div className='flex-1 flex flex-col p-6'>
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className='flex-1 flex flex-col'
          >
            {/* Tutorial Card */}
            <div className='flex-1 flex items-center justify-center mb-8'>
              <motion.div
                className={`w-full max-w-sm ${currentTutorial.bgColor} rounded-2xl p-8 text-center shadow-lg cursor-grab active:cursor-grabbing origin-bottom`}
                style={{ x, rotate, opacity }}
                drag='x'
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
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
                <div className='text-6xl mb-4'>{currentTutorial.emoji}</div>
                <h2 className='text-xl font-bold text-gray-900 mb-3'>
                  {currentTutorial.title}
                </h2>
                <p className='text-gray-700 mb-6'>
                  {currentTutorial.description}
                </p>
                <div className='bg-white rounded-lg p-3'>
                  <p className='text-sm font-medium text-gray-900'>
                    {currentTutorial.action}
                  </p>
                </div>
              </motion.div>
            </div>

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className='p-6'>
        <div className='text-center'>
          <p className='text-sm text-primary-foreground/80'>
            Swipe freely. <span className='font-bold'>No gas.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
