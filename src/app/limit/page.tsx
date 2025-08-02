'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, WalletIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/state/useAppStore';

const PRESET_AMOUNTS = [5, 10, 20, 50];

export default function SelectLimitPage() {
  const router = useRouter();
  const { trashThreshold, setTrashThreshold } = useAppStore();
  const [selectedAmount, setSelectedAmount] = useState(trashThreshold);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustomChange = (value: string) => {
    const numValue = value.replace(/[^0-9]/g, '');
    setCustomAmount(numValue);
    setIsCustom(true);
    if (numValue) {
      setSelectedAmount(parseInt(numValue));
    }
  };

  const currentThreshold =
    isCustom && customAmount ? parseInt(customAmount) : selectedAmount;

  return (
    <div className='min-h-screen bg-primary flex flex-col safe-area-inset-top safe-area-inset-bottom relative'>
      {/* Header */}
      <div className='flex items-center justify-between p-4'>
        <button
          onClick={() => router.back()}
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className='text-2xl font-bold text-primary-foreground mb-2'>
            What&apos;s trash to you?
          </h1>
          <p className='text-primary-foreground/80 mb-6'>
            Anything under this number gets sent to hell. Choose wisely.
          </p>

          {/* Selected Amount Display */}
          <div className='text-center mb-6'>
            <div className='text-5xl font-bold text-primary-foreground'>
              ${currentThreshold}
            </div>
            <p className='text-sm text-primary-foreground/60 mt-1'>Selected</p>
          </div>

          {/* Preset Amounts */}
          <div className='space-y-4 mb-4'>
            {PRESET_AMOUNTS.map((amount) => (
              <motion.button
                key={amount}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePresetSelect(amount)}
                className={`w-full p-3 rounded-xl text-lg font-medium transition-all ${
                  !isCustom && selectedAmount === amount
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'bg-white/20 text-primary-foreground hover:bg-white/30'
                }`}
              >
                ${amount}
              </motion.button>
            ))}

            {/* Custom Amount */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-3 rounded-xl transition-all ${
                isCustom
                  ? 'bg-white shadow-lg'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              <div className='flex items-center gap-3'>
                <span
                  className={`font-medium ${
                    isCustom ? 'text-gray-900' : 'text-primary-foreground'
                  }`}
                >
                  $
                </span>
                <input
                  type='text'
                  placeholder='Enter custom'
                  value={customAmount}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  className={`flex-1 bg-transparent outline-none font-medium ${
                    isCustom
                      ? 'text-gray-900'
                      : 'text-primary-foreground placeholder-primary-foreground/60'
                  }`}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* CTA Button */}
      <div className=' transform text-center w-full bg-primary-light px-6 py-8'>
        {/* CTA Button */}
        <Button
          onClick={() => {
            setTrashThreshold(currentThreshold);
            router.push('/tutorial');
          }}
          className='w-full bg-gray-900 hover:bg-gray-800 text-white h-14 rounded-full text-lg font-medium'
        >
          GO CLEANSE
        </Button>
        <p className='text-sm text-primary-foreground/80 pt-4'>
          17 worthy, <span className='font-bold'>40 on death row.</span>
        </p>
      </div>
    </div>
  );
}
