'use client';

import { useRouter } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/state/useAppStore';
import { useWallet } from '@/hooks/useWallet';
import { useOrderExecutor } from '@/lib/executor';

export default function SuccessPage() {
  const router = useRouter();
  const { dumpTokens, orders, sessions } = useAppStore();
  const { getSession } = useWallet();
  const { executePurge } = useOrderExecutor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const totalValue = dumpTokens.reduce(
    (sum, token) => sum + token.balanceUsd,
    0
  );
  const tokenCount = dumpTokens.length;

  // Execute orders when component mounts
  useEffect(() => {
    const executeOrders = async () => {
      if (dumpTokens.length === 0 || isExecuting || executionComplete) return;
      
      setIsExecuting(true);
      setExecutionError(null);
      
      try {
        // Get all required session handles
        const requiredChains = Array.from(new Set(dumpTokens.map(token => token.chainId)));
        const sessionHandles: Record<number, any> = {};
        
        for (const chainId of requiredChains) {
          const session = getSession(chainId);
          if (!session) {
            throw new Error(`No session available for chain ${chainId}`);
          }
          sessionHandles[chainId] = session;
        }
        
        // Execute the purge
        await executePurge(sessionHandles);
        setExecutionComplete(true);
      } catch (error) {
        console.error('Order execution failed:', error);
        setExecutionError(error instanceof Error ? error.message : 'Execution failed');
      } finally {
        setIsExecuting(false);
      }
    };

    executeOrders();
  }, [dumpTokens, executePurge, getSession, isExecuting, executionComplete]);

  // Calculate execution stats
  const executedOrders = orders.filter(order => order.status === 'executed');
  const failedOrders = orders.filter(order => order.status === 'failed');
  const actualValue = executedOrders.reduce((sum, order) => 
    sum + parseFloat(order.estimatedUSDC), 0
  );

  const createShareImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size (square for social media)
    canvas.width = 800;
    canvas.height = 800;

    // Load background image
    const bgImage = new Image();
    bgImage.src = '/bell-yellow.png';

    return new Promise<Blob | null>((resolve) => {
      bgImage.onload = async () => {
        // Draw background image
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

        // Add semi-transparent overlay to soften background
        ctx.fillStyle = 'rgba(249, 196, 0, 0.7)'; // Primary yellow with opacity
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // White card background
        const cardPadding = 100;
        const cardX = cardPadding;
        const cardY = cardPadding;
        const cardWidth = canvas.width - cardPadding * 2;
        const cardHeight = canvas.height - cardPadding * 2;
        const borderRadius = 32;

        // Draw rounded rectangle for card
        ctx.beginPath();
        ctx.moveTo(cardX + borderRadius, cardY);
        ctx.lineTo(cardX + cardWidth - borderRadius, cardY);
        ctx.quadraticCurveTo(
          cardX + cardWidth,
          cardY,
          cardX + cardWidth,
          cardY + borderRadius
        );
        ctx.lineTo(cardX + cardWidth, cardY + cardHeight - borderRadius);
        ctx.quadraticCurveTo(
          cardX + cardWidth,
          cardY + cardHeight,
          cardX + cardWidth - borderRadius,
          cardY + cardHeight
        );
        ctx.lineTo(cardX + borderRadius, cardY + cardHeight);
        ctx.quadraticCurveTo(
          cardX,
          cardY + cardHeight,
          cardX,
          cardY + cardHeight - borderRadius
        );
        ctx.lineTo(cardX, cardY + borderRadius);
        ctx.quadraticCurveTo(cardX, cardY, cardX + borderRadius, cardY);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Card content
        const centerX = canvas.width / 2;
        ctx.textAlign = 'center';

        // "You Just Fumbled!" title
        ctx.fillStyle = '#111827'; // gray-900
        ctx.font = 'bold 48px Nippo, sans-serif';
        ctx.fillText('You Just Fumbled!', centerX, cardY + 120);

        // Token count
        ctx.font = '600 36px Nippo, sans-serif';
        ctx.fillStyle = '#111827'; // gray-900
        ctx.fillText(`${tokenCount} Tokens`, centerX, cardY + 220);

        // Saved amount
        ctx.font = 'bold 72px Nippo, sans-serif';
        ctx.fillStyle = '#34C759'; // success color
        ctx.fillText(`$${totalValue.toFixed(2)} saved.`, centerX, cardY + 320);

        // Bottom text
        ctx.font = '28px Nippo, sans-serif';
        ctx.fillStyle = '#6B7280'; // gray-600
        ctx.fillText(
          'More than your last 3 trades combined.',
          centerX,
          cardY + 380
        );

        // Final message
        ctx.font = '32px Nippo, sans-serif';
        ctx.fillStyle = '#374151'; // gray-700
        const finalText = 'You can now open your wallet';
        const finalText2 = 'in public again.';
        ctx.fillText(finalText, centerX, cardY + 480);
        ctx.fillText(finalText2, centerX, cardY + 520);

        // Convert to blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      };

      bgImage.onerror = () => {
        // Fallback if background image fails - just use yellow background
        ctx.fillStyle = '#F9C400';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Continue with the card drawing...
        // (same card drawing code as above but without the background image)
        resolve(null);
      };
    });
  };

  const handleShare = async () => {
    // Create the shareable image
    const imageBlob = await createShareImage();

    if (imageBlob) {
      // Create a temporary URL for the blob
      const imageUrl = URL.createObjectURL(imageBlob);

      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.download = `fumble-${Date.now()}.png`;
      link.href = imageUrl;
      link.click();

      // Clean up
      URL.revokeObjectURL(imageUrl);

      // Also try to share if Web Share API supports files
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [new File([imageBlob], 'fumble.png', { type: 'image/png' })],
        })
      ) {
        try {
          await navigator.share({
            title: 'I Just Fumbled!',
            text: `Just cleaned up ${tokenCount} trash tokens and saved $${totalValue.toFixed(
              2
            )}!`,
            files: [new File([imageBlob], 'fumble.png', { type: 'image/png' })],
          });
        } catch (error) {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  const resetApp = () => {
    // Reset state and go back to start
    // You could also call a reset function from the store
    router.push('/enter');
  };

  return (
    <div className='min-h-screen bg-primary flex flex-col safe-area-inset-top safe-area-inset-bottom'>
      {/* Header */}
      <div className='flex items-center justify-center p-4'>
        <img src='/bell.png' alt='Bell' className='w-8 h-8' />
      </div>

      {/* Content */}
      <div className='flex-1 flex flex-col items-center justify-center px-6'>
        <AnimatePresence mode='wait'>
          {isExecuting && (
            <motion.div
              key='executing'
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.6, type: 'spring' }}
              className='text-center'
            >
              {/* Loading Icon */}
              <div className='w-32 h-32 bg-white rounded-full mx-auto mb-8 flex items-center justify-center'>
                <Loader2 className='w-16 h-16 text-primary animate-spin' />
              </div>

              {/* Execution Message */}
              <div className='bg-white rounded-2xl p-8 mb-8 max-w-sm mx-auto'>
                <h1 className='text-2xl font-bold text-gray-900 mb-4'>
                  Purging Tokens...
                </h1>
                <p className='text-gray-700 mb-4'>
                  Submitting {tokenCount} orders across chains
                </p>
                
                {/* Progress */}
                <div className='space-y-2'>
                  <div className='text-sm text-gray-600'>
                    {executedOrders.length + failedOrders.length} / {tokenCount} processed
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div 
                      className='bg-primary h-2 rounded-full transition-all duration-300'
                      style={{ 
                        width: `${((executedOrders.length + failedOrders.length) / tokenCount) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {(executionComplete || executionError) && (
            <motion.div
              key='complete'
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: 'spring' }}
              className='text-center'
            >
              {/* Success/Error Icon */}
              <div className='w-32 h-32 bg-white rounded-full mx-auto mb-8 flex items-center justify-center'>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                >
                  {executionError ? (
                    <XCircle className='w-16 h-16 text-red-500' />
                  ) : (
                    <CheckCircle className='w-16 h-16 text-green-500' />
                  )}
                </motion.div>
              </div>

              {/* Results Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className='bg-white rounded-2xl p-8 mb-8 max-w-sm mx-auto'
              >
                {executionError ? (
                  <>
                    <h1 className='text-2xl font-bold text-gray-900 mb-4'>
                      Purge Failed
                    </h1>
                    <p className='text-red-600 mb-4'>{executionError}</p>
                    <p className='text-gray-700'>
                      Some orders may have been processed. Check your wallet.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className='text-2xl font-bold text-gray-900 mb-4'>
                      You Just Fumbled!
                    </h1>
                    <div className='space-y-2 mb-6'>
                      <p className='text-lg font-semibold text-gray-900'>
                        {executedOrders.length} Tokens Purged
                      </p>
                      <p className='text-3xl font-bold text-success'>
                        ${actualValue.toFixed(2)} rescued
                      </p>
                      {failedOrders.length > 0 && (
                        <p className='text-sm text-orange-600'>
                          {failedOrders.length} orders failed
                        </p>
                      )}
                    </div>
                    <p className='text-gray-700'>
                      You can now open your wallet in public again.
                    </p>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons - Only show when execution is complete */}
      {(executionComplete || executionError) && (
        <div className='p-6 space-y-3'>
          {!executionError && (
            <Button
              onClick={handleShare}
              className='w-full bg-[linear-gradient(to_bottom,_#47474D_0%,_#47474D_35%,_#1B1B1D_100%)] disabled:opacity-30 text-white h-14 rounded-2xl text-lg font-medium mb-4'
            >
              <Share className='w-5 h-5 mr-2' />
              SHARE MY FUMBLE
            </Button>
          )}

          <Button
            onClick={resetApp}
            variant='outline'
            className='w-full border-0 bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent text-gray-900 hover:text-gray-700 h-14 rounded-full text-lg font-medium transition-colors'
          >
            {executionError ? 'TRY AGAIN' : 'ANOTHER WALLET'}
          </Button>
        </div>
      )}

      {/* Hidden Canvas for generating share image */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
