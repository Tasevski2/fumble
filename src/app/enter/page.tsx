'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/state/useAppStore';
import { z } from 'zod';
import { scanAddresses, mockScanAddresses } from '@/lib/scanner';

// Ethereum address validation schema
const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Not a valid address');

export default function EnterAddressesPage() {
  const router = useRouter();
  const {
    addresses,
    addAddress,
    removeAddress,
    setTokens,
    trashThreshold,
    setIsScanning,
  } = useAppStore();
  const [inputValue, setInputValue] = useState('');
  const [showError, setShowError] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [isScanning, setIsScanningLocal] = useState(false);

  const handlePaste = async () => {
    if (isPasting) return; // Prevent multiple paste operations

    setIsPasting(true);

    try {
      const text = await navigator.clipboard.readText();
      setInputValue(text);
      validateAndAddAddress(text);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      console.error('Failed to read clipboard:', err);
    }

    // Reset pasting flag after a short delay
    setTimeout(() => {
      setIsPasting(false);
    }, 500);
  };

  const validateAndAddAddress = (address: string) => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) return;

    // Check if address already exists
    const addressExists = addresses.some(
      (addr) => addr.address.toLowerCase() === trimmedAddress.toLowerCase()
    );

    if (addressExists) {
      setInputValue('');
      setShowError(false);
      return; // Don't add duplicate
    }

    try {
      addressSchema.parse(trimmedAddress);
      addAddress(trimmedAddress);
      setInputValue('');
      setShowError(false);
    } catch (error) {
      setShowError(true);
    }
  };

  const handleScanAddresses = async () => {
    if (addresses.length === 0) return;

    setIsScanningLocal(true);
    setIsScanning(true);

    try {
      const addressList = addresses.map((addr) => addr.address);

      // For now, use mock data. Change to scanAddresses for real implementation
      const tokens =
        process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true'
          ? await mockScanAddresses(addressList, trashThreshold)
          : await scanAddresses(addressList, trashThreshold);
      console.log(tokens);
      setTokens(tokens);
      router.push('/limit');
    } catch (error) {
      console.error('Scanning error:', error);
      // For now, proceed with mock data on error
      const addressList = addresses.map((addr) => addr.address);
      const tokens = await mockScanAddresses(addressList, trashThreshold);
      setTokens(tokens);
      router.push('/limit');
    } finally {
      setIsScanningLocal(false);
      setIsScanning(false);
    }
  };

  const canProceed = addresses.length > 0;

  return (
    <div className='min-h-screen bg-primary flex flex-col safe-area-inset-top safe-area-inset-bottom'>
      {/* Header */}
      <div className='flex items-center justify-between p-4'>
        <button
          onClick={() => router.back()}
          className='p-2 -ml-2 rounded-full hover:bg-black/10 transition-colors'
        >
          <ArrowLeft className='w-6 h-6' />
        </button>
        <img src='/bell.png' alt='Bell' className='w-8 h-8' />
        <div className='w-10' /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className='flex-1 flex flex-col p-6'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className='text-2xl font-bold text-primary-foreground mb-8'>
            Enter wallet addresses
          </h1>

          {/* Input Field */}
          <div className='mb-6'>
            <div className='relative'>
              <input
                type='text'
                value={inputValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setInputValue(value);
                  setShowError(false);

                  // Auto-validate and add if it's a complete ethereum address (but not during paste)
                  if (
                    !isPasting &&
                    value.length === 42 &&
                    value.startsWith('0x')
                  ) {
                    validateAndAddAddress(value);
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    validateAndAddAddress(inputValue);
                  }
                }}
                onPaste={(e) => {
                  // Handle paste directly on the input
                  if (isPasting) return; // Prevent duplicate handling

                  setIsPasting(true);
                  const pastedText = e.clipboardData?.getData('text') || '';
                  if (pastedText) {
                    setInputValue(pastedText);
                    validateAndAddAddress(pastedText);
                  }

                  // Reset pasting flag
                  setTimeout(() => {
                    setIsPasting(false);
                  }, 300);
                }}
                placeholder='0xC02...e28f34'
                className={`w-full px-4 py-3 pr-20 bg-white rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  showError
                    ? 'focus:ring-destructive border-2 border-destructive'
                    : 'focus:ring-gray-300'
                }`}
              />
              <Button
                onClick={handlePaste}
                size='sm'
                variant='secondary'
                className='absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border-0'
              >
                Paste
              </Button>
            </div>
            {showError && (
              <p className='mt-2 text-sm text-destructive'>
                Not a valid address
              </p>
            )}
          </div>

          {/* Address List */}
          <div className='space-y-3 flex-1'>
            {addresses.map((addr, index) => (
              <motion.div
                key={addr.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className='flex items-center gap-3 bg-white rounded-xl p-3'
              >
                <span className='flex-1 text-gray-900 font-mono text-sm truncate'>
                  {addr.address}
                </span>
                <button
                  onClick={() => removeAddress(addr.id)}
                  className='p-1 hover:bg-gray-100 rounded-md transition-colors'
                >
                  <X className='w-5 h-5 text-gray-500' />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* CTA Button */}
      <div className='p-6 py-8 bg-primary-light'>
        <Button
          onClick={handleScanAddresses}
          disabled={!canProceed || isScanning}
          className='w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white h-14 rounded-full text-lg font-medium'
        >
          {isScanning ? (
            <>
              <Loader2 className='w-5 h-5 animate-spin mr-2' />
              SCANNING...
            </>
          ) : (
            'SCAN ADDRESSES'
          )}
        </Button>
      </div>
    </div>
  );
}
