'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  WalletIcon,
  CheckCircle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/state/useAppStore';
import { formatPrice } from '@/utils/mock';
import { useWallet } from '@/hooks/useWallet';
import { getChainConfig } from '@/config/chains';
import { getTokenOrderStatus, isOrderFinal } from '@/utils/orderStatus';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { useOrderExecutor } from '@/lib/executor';
import Image from 'next/image';

export default function SummaryPage() {
  const router = useRouter();
  const { dumpTokens, addresses, orders, resetAppState } = useAppStore();

  // Get sessions directly from store to ensure we have latest state
  const sessions = useAppStore((state) => state.sessions);

  const {
    connect,
    initializeSession,
    hasSession,
    isConnecting,
    isConnected,
    address,
    chainId,
    error,
    getSession,
  } = useWallet();

  const { executePurge } = useOrderExecutor();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [initializingSessions, setInitializingSessions] = useState<
    Record<number, boolean>
  >({});
  const [footerHeight, setFooterHeight] = useState(0);
  const footerRef = useRef<HTMLDivElement>(null);

  // Debug Wagmi state
  useEffect(() => {
    console.log('🔍 Wagmi State Debug:', {
      isConnected,
      address,
      chainId,
      isConnecting,
      error,
      addressesCount: addresses.length,
    });
  }, [isConnected, address, chainId, isConnecting, error, addresses.length]);

  // Debug modal state
  useEffect(() => {
    console.log('🔍 Modal State Debug:', {
      showWalletModal,
      showSessionModal,
      footerHeight,
    });
  }, [showWalletModal, showSessionModal, footerHeight]);

  const totalValue = dumpTokens.reduce(
    (sum, token) => sum + token.balanceUsd,
    0
  );

  useEffect(() => {
    if (footerRef.current) {
      setFooterHeight(footerRef.current.offsetHeight);
    }
  }, []);

  // Get unique chains from dump tokens
  const chainsToEnable = Array.from(
    new Set(dumpTokens.map((token) => token.chainId))
  );

  const handleConnect = async (addressId: string) => {
    console.log(
      '🔗 CONNECTING - handleConnect called with addressId:',
      addressId
    );
    console.log('🔗 isConnecting state:', isConnecting);
    console.log('🔗 addresses:', addresses);
    console.log('🔗 connect function available:', typeof connect);

    try {
      await connect(addressId);
      console.log('🔗 Connection attempt completed');
    } catch (err) {
      console.error('🔗 Connection failed:', err);
    }
  };

  const handleEnableSession = async (chainId: number) => {
    setInitializingSessions((prev) => ({ ...prev, [chainId]: true }));
    try {
      console.log(`🔗 Starting session initialization for chain ${chainId}...`);
      await initializeSession(chainId);
      console.log(`✅ Session successfully initialized for chain ${chainId}`);

      // Force re-render to update session state
      const latestSessions = useAppStore.getState().sessions;
      console.log('📦 Latest sessions after initialization:', latestSessions);
    } catch (err) {
      console.error(
        `❌ Session initialization failed for chain ${chainId}:`,
        err
      );
      // Show user-friendly error message
      const errorMessage =
        err instanceof Error ? err.message : 'Session initialization failed';
      alert(
        `Failed to create smart account for chain ${chainId}: ${errorMessage}\n\nPlease try again or contact support.`
      );
    } finally {
      setInitializingSessions((prev) => ({ ...prev, [chainId]: false }));
    }
  };

  const handlePurgeClick = () => {
    // Check if any address is connected
    const hasConnectedAddress = addresses.some((addr) => addr.isConnected);

    if (!hasConnectedAddress) {
      setShowWalletModal(true);
      return;
    }

    // Check if sessions are enabled for all required chains
    const missingChains = chainsToEnable.filter(
      (chainId) => !hasSession(chainId)
    );

    if (missingChains.length > 0) {
      console.log('🔗 Missing sessions for chains:', missingChains);
      setShowSessionModal(true);
      return;
    }

    // Double-check sessions are actually stored before navigation
    const storedSessions = useAppStore.getState().sessions;
    console.log(
      '✅ Checking stored sessions before navigation:',
      storedSessions
    );

    const actuallyMissingChains = chainsToEnable.filter((chainId) => {
      const session = storedSessions[chainId];
      return !session || !session.isEnabled;
    });

    if (actuallyMissingChains.length > 0) {
      console.error(
        '❌ Sessions not properly stored for chains:',
        actuallyMissingChains
      );
      setShowSessionModal(true);
      return;
    }

    // All requirements met - proceed to execution
    console.log('✅ All sessions verified, navigating to success page');
    router.push('/success');
  };

  const closeModal = () => {
    setShowWalletModal(false);
    setShowSessionModal(false);
  };

  const handleRetryOrder = async (tokenSymbol: string, chainId: number) => {
    try {
      // Get required session handles for retry
      const requiredChains = [chainId];
      const sessionHandles: Record<number, any> = {};

      for (const cId of requiredChains) {
        const session = await getSession(cId);
        if (!session) {
          throw new Error(`No session available for chain ${cId}`);
        }
        sessionHandles[cId] = session;
      }

      // Find the failed token
      const failedToken = dumpTokens.find(
        (token) => token.symbol === tokenSymbol && token.chainId === chainId
      );

      if (!failedToken) {
        console.error('Failed token not found for retry');
        return;
      }

      // Execute retry for single token
      await executePurge(sessionHandles);
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  const handleStartOver = () => {
    resetAppState();
    router.push('/enter');
  };

  return (
    <div className='h-screen bg-white flex flex-col safe-area-inset-top safe-area-inset-bottom'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 pb-8 flex-shrink-0'>
        <button
          onClick={handleStartOver}
          className='p-2 -ml-2 rounded-full hover:bg-black/10 transition-colors'
        >
          <RotateCcw className='w-6 h-6' />
        </button>
        <Image
          src='/bell-yellow.png'
          alt='Bell'
          width={32}
          height={32}
          className='w-8 h-8'
        />
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
            {orders.length > 0 && (
              <p className='text-sm text-primary-foreground/60 mt-2'>
                Order status shown for each token
              </p>
            )}
          </div>

          {/* Dump List */}
          <div className='rounded-2xl p-4 mb-6 bg-[#EEEFF1]'>
            {dumpTokens.length > 0 ? (
              <div className='space-y-3'>
                {dumpTokens.map((token, index) => {
                  const orderStatus = getTokenOrderStatus(token, orders);

                  return (
                    <motion.div
                      key={token.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className='flex items-center justify-between p-3 bg-gray-50 rounded-xl'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center'>
                          {token.logoUrl ? (
                            <Image
                              src={token.logoUrl}
                              alt={token.symbol}
                              width={32}
                              height={32}
                              className='w-8 h-8 rounded-full'
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  'none';
                              }}
                            />
                          ) : (
                            <span className='text-xs font-bold text-gray-600'>
                              {token.symbol.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2 mb-1'>
                            <p className='font-medium text-gray-900'>
                              {token.symbol}
                            </p>
                            {orderStatus.status !== 'none' && (
                              <OrderStatusBadge
                                status={orderStatus.status}
                                className='text-xs'
                              />
                            )}
                          </div>
                          <p className='text-sm text-gray-500'>
                            {orderStatus.status === 'executed'
                              ? 'to USDC ✓'
                              : 'to USDC'}
                          </p>
                        </div>
                      </div>
                      <div className='text-right'>
                        <p className='font-bold text-gray-900'>
                          ${token.balanceUsd.toFixed(2)}
                        </p>
                        {orderStatus.order?.estimatedUSDC &&
                          orderStatus.status === 'executed' && (
                            <p className='text-xs text-green-600 mt-1'>
                              +$
                              {parseFloat(
                                orderStatus.order.estimatedUSDC
                              ).toFixed(2)}{' '}
                              USDC
                            </p>
                          )}
                        {orderStatus.status === 'failed' && (
                          <button
                            onClick={() =>
                              handleRetryOrder(token.symbol, token.chainId)
                            }
                            className='text-xs text-blue-600 hover:text-blue-800 mt-1 underline'
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
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
              className='fixed inset-0 bg-gray-500/20 z-55'
              onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />

            {/* Modal - slides from behind footer */}
            <motion.div
              className='fixed left-0 right-0 bg-primary z-60 rounded-t-3xl overflow-hidden pointer-events-auto'
              style={{ bottom: 0 }}
              initial={{ y: '100%' }}
              animate={{ y: `-${footerHeight}px` }}
              exit={{
                y: '100%',
                transition: { duration: 0.3, ease: 'easeIn' },
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className='p-6 pointer-events-auto'>
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
                            {addr.isConnected ? 'Connected' : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={(e) => {
                          console.log('🎯 Button clicked!', {
                            addressId: addr.id,
                            disabled: isConnecting,
                            event: e,
                          });
                          e.stopPropagation();
                          handleConnect(addr.id);
                        }}
                        onMouseDown={() => {
                          console.log('🎯 Button mouse down:', addr.id);
                        }}
                        disabled={isConnecting}
                        variant={addr.isConnected ? 'secondary' : 'default'}
                        size='sm'
                        className={
                          addr.isConnected
                            ? 'bg-success text-white hover:bg-success/90 pointer-events-auto'
                            : 'bg-white text-primary-foreground hover:bg-white/90 pointer-events-auto'
                        }
                        style={{ pointerEvents: 'auto' }}
                      >
                        {isConnecting
                          ? 'Connecting...'
                          : addr.isConnected
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

      {/* Session Enablement Modal */}
      <AnimatePresence>
        {showSessionModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className='fixed inset-0 bg-gray-500/20 z-65'
              onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />

            {/* Modal */}
            <motion.div
              className='fixed left-0 right-0 bg-primary z-70 rounded-t-3xl overflow-hidden'
              style={{ bottom: 0 }}
              initial={{ y: '100%' }}
              animate={{ y: `-${footerHeight}px` }}
              exit={{
                y: '100%',
                transition: { duration: 0.3, ease: 'easeIn' },
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className='p-6'>
                <h1 className='text-2xl text-center font-bold text-primary-foreground mb-6'>
                  Enable gasless trading
                </h1>
                <p className='text-center text-primary-foreground/80 mb-8'>
                  One prompt per chain, then swipe freely without gas fees.
                </p>

                <div className='space-y-3'>
                  {chainsToEnable.map((chainId) => {
                    const chainConfig = getChainConfig(chainId);
                    const isEnabled = hasSession(chainId);
                    const isInitializing = initializingSessions[chainId];

                    return (
                      <motion.div
                        key={chainId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className='flex items-center justify-between p-3 bg-white/20 rounded-xl'
                      >
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 bg-white/30 rounded-full flex items-center justify-center'>
                            {isEnabled ? (
                              <CheckCircle className='w-5 h-5 text-green-400' />
                            ) : (
                              <XCircle className='w-5 h-5 text-primary-foreground/60' />
                            )}
                          </div>
                          <div>
                            <p className='font-medium text-primary-foreground'>
                              {chainConfig?.name || `Chain ${chainId}`}
                            </p>
                            <p className='text-xs text-primary-foreground/60'>
                              {isEnabled
                                ? 'Gasless enabled'
                                : 'Enable gasless trading'}
                            </p>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleEnableSession(chainId)}
                          disabled={isEnabled || isInitializing}
                          size='sm'
                          className={
                            isEnabled
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-white text-primary-foreground hover:bg-white/90'
                          }
                        >
                          {isInitializing
                            ? 'Enabling...'
                            : isEnabled
                            ? 'Enabled'
                            : 'Enable'}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>

                {error && (
                  <div className='mt-4 p-3 bg-red-500/20 rounded-xl'>
                    <p className='text-sm text-red-200 text-center'>{error}</p>
                  </div>
                )}

                <div className='mt-6'>
                  <Button
                    onClick={() => {
                      // Double-check all sessions are enabled before navigating
                      const missingChains = chainsToEnable.filter(
                        (chainId) => !hasSession(chainId)
                      );

                      if (missingChains.length > 0) {
                        console.error(
                          '❌ Cannot proceed, missing sessions for chains:',
                          missingChains
                        );
                        alert(
                          `Please enable sessions for all chains before proceeding.\n\nMissing chains: ${missingChains.join(
                            ', '
                          )}`
                        );
                        return;
                      }

                      console.log(
                        '✅ All sessions enabled, proceeding to success page'
                      );
                      router.push('/success');
                    }}
                    disabled={chainsToEnable.some(
                      (chainId) =>
                        !hasSession(chainId) || initializingSessions[chainId]
                    )}
                    className='w-full bg-white text-primary-foreground hover:bg-white/90 h-12 rounded-xl font-medium'
                  >
                    {Object.values(initializingSessions).some((v) => v)
                      ? 'Enabling Sessions...'
                      : 'Continue to Purge'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
