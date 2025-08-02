'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ExternalLink, WalletIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/state/useAppStore';
import { formatPrice } from '@/utils/mock';

export default function SummaryPage() {
  const router = useRouter();
  const { dumpTokens, addresses } = useAppStore();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const footerRef = useRef<HTMLDivElement>(null);

  const totalValue = dumpTokens.reduce(
    (sum, token) => sum + token.balanceUsd,
    0
  );

  useEffect(() => {
    if (footerRef.current) {
      setFooterHeight(footerRef.current.offsetHeight);
    }
  }, []);

  const handleConnect = (address: string) => {
    // Mock wallet connection
    setConnectedWallet(address);
    console.log('Connected to address:', address);
  };

  const handlePurgeClick = () => {
    // If modal is already open and user clicks purge, proceed to success
    if (showWalletModal) {
      router.push('/success');
      return;
    }

    // Check if connected wallet matches any scanned address
    const hasMatchingWallet =
      connectedWallet &&
      addresses.some(
        (addr) => addr.address.toLowerCase() === connectedWallet.toLowerCase()
      );

    if (!hasMatchingWallet) {
      setShowWalletModal(true);
    } else {
      router.push('/success');
    }
  };

  const closeModal = () => {
    setShowWalletModal(false);
  };

  return (
    <div className='h-screen bg-white flex flex-col safe-area-inset-top safe-area-inset-bottom'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 pb-8 flex-shrink-0'>
        <button
          onClick={() => router.back()}
          className='p-2 -ml-2 rounded-full hover:bg-black/10 transition-colors'
        >
          <ArrowLeft className='w-6 h-6' />
        </button>
        <img src='/bell-yellow.png' alt='Bell' className='w-8 h-8' />
        <button className='p-2 -mr-2 rounded-full hover:bg-black/10 transition-colors'>
          <WalletIcon className='w-6 h-6' />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className='flex-1 overflow-y-auto px-6 pb-6'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Total Rescued */}
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold text-primary-foreground mb-2'>
              ${totalValue.toFixed(2)}
            </h1>
            <p className='text-primary-foreground/80'>rescued from the ruins</p>
          </div>

          {/* Dump List */}
          <div className='rounded-2xl p-4 mb-6 bg-[#EEEFF1]'>
            {dumpTokens.length > 0 ? (
              <div className='space-y-3'>
                {dumpTokens.map((token, index) => (
                  <motion.div
                    key={token.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className='flex items-center justify-between p-3 bg-gray-50 rounded-xl'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center'>
                        <span className='text-xs font-bold text-gray-600'>
                          {token.symbol.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className='font-medium text-gray-900'>
                          {token.symbol}
                        </p>
                        <p className='text-sm text-gray-500'>to USDT</p>
                      </div>
                    </div>
                    <p className='font-bold text-gray-900'>
                      ${token.balanceUsd.toFixed(2)}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8 text-gray-500'>
                <p>No tokens selected for conversion</p>
              </div>
            )}
          </div>

          {/* Connect Wallets - Hidden but preserved */}
          {false && (
            <div className='bg-white rounded-2xl p-4'>
              <h2 className='font-bold text-lg text-gray-900 mb-4'>
                Connect wallets to purge them.
              </h2>

              <div className='space-y-3'>
                {addresses.map((addr, index) => (
                  <motion.div
                    key={addr.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className='flex items-center justify-between p-3 bg-gray-50 rounded-xl'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center'>
                        <ExternalLink className='w-4 h-4 text-gray-600' />
                      </div>
                      <div>
                        <p className='font-mono text-sm text-gray-900'>
                          {addr.address.slice(0, 6)}...{addr.address.slice(-4)}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {addr.isConnected ? 'Connected' : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleConnect(addr.id)}
                      variant={addr.isConnected ? 'secondary' : 'default'}
                      size='sm'
                      className={
                        addr.isConnected ? 'bg-success text-white' : ''
                      }
                    >
                      {addr.isConnected ? 'Connected' : 'Connect'}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer - Fixed at bottom */}
      <div
        ref={footerRef}
        className='flex-shrink-0 px-6 py-8 border-t border-gray-100 bg-primary-light relative z-50'
      >
        <Button
          onClick={handlePurgeClick}
          disabled={dumpTokens.length === 0}
          className='w-full bg-[linear-gradient(to_bottom,_#47474D_0%,_#47474D_35%,_#1B1B1D_100%)] disabled:opacity-30 text-white h-14 rounded-2xl text-lg font-medium mb-4'
        >
          PURGE THEM
        </Button>
        <p className='text-sm text-center text-primary-foreground/80'>
          No gas fees. The only burn is emotional.
        </p>
      </div>

      {/* Wallet Connection Modal */}
      <AnimatePresence>
        {showWalletModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className='fixed inset-0 bg-gray-500/20 z-40'
              onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />

            {/* Modal - slides from behind footer */}
            <motion.div
              className='fixed left-0 right-0 bg-primary z-30 rounded-t-3xl overflow-hidden'
              style={{ bottom: 0 }}
              initial={{ y: '100%' }}
              animate={{ y: `-${footerHeight}px` }}
              exit={{ y: '100%', transition: { duration: 0.3, ease: 'easeIn' } }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className='p-6'>
                <h1 className='text-2xl text-center font-bold text-primary-foreground mb-6'>
                  Connect wallets to <br /> purge them.
                </h1>

                <div className='space-y-3'>
                  {addresses.map((addr, index) => (
                    <motion.div
                      key={addr.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className='flex items-center justify-between p-3 bg-white/20 rounded-xl'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 bg-white/30 rounded-full flex items-center justify-center'>
                          <ExternalLink className='w-5 h-5 text-primary-foreground' />
                        </div>
                        <div>
                          <p className='font-mono text-sm text-primary-foreground'>
                            {addr.address.slice(0, 6)}...
                            {addr.address.slice(-4)}
                          </p>
                          <p className='text-xs text-primary-foreground/60'>
                            {connectedWallet?.toLowerCase() ===
                            addr.address.toLowerCase()
                              ? 'Connected'
                              : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleConnect(addr.address)}
                        variant={
                          connectedWallet?.toLowerCase() ===
                          addr.address.toLowerCase()
                            ? 'secondary'
                            : 'default'
                        }
                        size='sm'
                        className={
                          connectedWallet?.toLowerCase() ===
                          addr.address.toLowerCase()
                            ? 'bg-success text-white hover:bg-success/90'
                            : 'bg-white text-primary-foreground hover:bg-white/90'
                        }
                      >
                        {connectedWallet?.toLowerCase() ===
                        addr.address.toLowerCase()
                          ? 'Connected'
                          : 'Connect'}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
