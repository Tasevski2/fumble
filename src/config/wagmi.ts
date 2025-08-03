import { createConfig, http } from 'wagmi';
import { arbitrum, base } from 'wagmi/chains';
import { metaMask, injected } from 'wagmi/connectors';

// Supported chains for Fumble
export const supportedChains = [arbitrum, base] as const;

// Wagmi configuration
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'Fumble',
        url:
          typeof window !== 'undefined'
            ? window.location.origin
            : 'https://fumble.app',
        iconUrl:
          typeof window !== 'undefined'
            ? `${window.location.origin}/logo.png`
            : 'https://fumble.app/logo.png',
      },
      useDeeplink: true,
      preferDesktop: false, // Important for mobile PWA
      checkInstallationImmediately: false,
      extensionOnly: false,
    }),
    injected(), // Fallback for other wallets
  ],
  transports: {
    [arbitrum.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
});

// Type exports for better TypeScript support
export type SupportedChainId = (typeof supportedChains)[number]['id'];

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
