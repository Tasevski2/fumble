import axios from 'axios';
import { getChainConfig, ACTIVE_CHAIN_IDS } from '@/config/chains';
import { Token } from '@/types';
import { createPublicClient, http, parseAbi } from 'viem';
import { arbitrum, base } from 'viem/chains';

// ERC20 ABI for balance checking
const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
]);

// Map chain IDs to viem chains
const chainMap = {
  42161: arbitrum,
  8453: base,
} as const;

// Get token list from 1inch for a specific chain
async function getTokenList(chainId: number): Promise<Record<string, any>> {
  try {
    const response = await fetch(`/api/oneinch/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId,
        addresses: [], // Get all tokens
      }),
    });

    if (!response.ok) {
      console.error(`Failed to get token list for chain ${chainId}`);
      return {};
    }

    const data = await response.json();
    // Convert array to object keyed by address
    const tokenMap: Record<string, any> = {};
    for (const token of data.tokens || []) {
      tokenMap[token.address.toLowerCase()] = token;
    }
    return tokenMap;
  } catch (error) {
    console.error(`Error fetching token list for chain ${chainId}:`, error);
    return {};
  }
}

// Get token balances for addresses on supported chains using 1inch Balance API
export async function scanAddresses(
  addresses: string[],
  threshold: number = 5
): Promise<Token[]> {
  const allTokens: Token[] = [];

  // Process each chain
  for (const chainId of ACTIVE_CHAIN_IDS) {
    try {
      // For each wallet address
      for (const walletAddress of addresses) {
        // Get balances from 1inch Balance API
        const balanceResponse = await fetch(
          `/api/oneinch/balance?chainId=${chainId}&address=${walletAddress}`
        );

        if (!balanceResponse.ok) {
          console.warn(
            `Failed to get balances for ${walletAddress} on chain ${chainId}`
          );
          continue;
        }

        const balanceData = await balanceResponse.json();
        const tokenAddresses = Object.keys(balanceData.balances);

        if (tokenAddresses.length === 0) continue;

        // Get token metadata from 1inch
        const tokenResponse = await fetch('/api/oneinch/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId,
            addresses: tokenAddresses,
          }),
        });

        let tokenMetadata: Record<string, any> = {};
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          // Convert array to object keyed by address
          for (const token of tokenData.tokens || []) {
            tokenMetadata[token.address.toLowerCase()] = token;
          }
        }

        // Get prices for tokens with balances
        const priceResponse = await fetch('/api/oneinch/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId,
            tokens: tokenAddresses,
          }),
        });
        let prices: Record<string, number> = {};
        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          prices = priceData.prices || {};
        }

        // Process each token balance
        for (const [tokenAddress, balance] of Object.entries(
          balanceData.balances
        )) {
          try {
            const balanceBigInt = BigInt(balance as string);
            if (balanceBigInt === BigInt(0)) continue;

            // Get token metadata
            const tokenInfo = tokenMetadata[tokenAddress.toLowerCase()];
            if (!tokenInfo) {
              console.warn(
                `No metadata for token ${tokenAddress} on chain ${chainId}`
              );
              continue;
            }

            // Skip spam tokens
            if (
              tokenInfo.tags?.includes('spam') ||
              tokenInfo.tags?.includes('scam')
            ) {
              continue;
            }

            // Calculate USD value
            const decimals = tokenInfo.decimals || 18;
            const balanceFormatted =
              Number(balanceBigInt) / Math.pow(10, decimals);
            const tokenPrice = prices[tokenAddress] || 0;
            const balanceUsd = balanceFormatted * tokenPrice;

            // Only include tokens below threshold
            if (balanceUsd <= threshold) {
              allTokens.push({
                id: `${chainId}-${walletAddress}-${tokenAddress}`,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                address: tokenAddress,
                balance: balanceBigInt.toString(),
                balanceUsd,
                price: tokenPrice,
                change24h: 0, // 1inch price API doesn't include 24h change
                chainId,
                logoUrl: tokenInfo.logoUrl,
              });
            }
          } catch (error) {
            console.warn(`Error processing token ${tokenAddress}:`, error);
            continue;
          }
        }

        // Add native ETH if it has value
        const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        if (balanceData.balances[ethAddress]) {
          const ethBalance = BigInt(balanceData.balances[ethAddress]);
          const ethBalanceFormatted = Number(ethBalance) / 1e18;
          const ethPrice =
            prices[ethAddress] ||
            prices['0x0000000000000000000000000000000000000000'] ||
            0;
          const ethValueUsd = ethBalanceFormatted * ethPrice;

          if (ethValueUsd <= threshold) {
            allTokens.push({
              id: `${chainId}-${walletAddress}-eth`,
              symbol: 'ETH',
              name: 'Ethereum',
              address: ethAddress,
              balance: ethBalance.toString(),
              balanceUsd: ethValueUsd,
              price: ethPrice,
              change24h: 0,
              chainId,
              logoUrl: '/icons/eth.png',
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning chain ${chainId}:`, error);
    }
  }

  // Sort by USD value descending
  return allTokens.sort((a, b) => b.balanceUsd - a.balanceUsd);
}

// Mock scanner for testing (returns fake data)
export async function mockScanAddresses(
  addresses: string[],
  threshold: number = 5
): Promise<Token[]> {
  const mockTokens: Token[] = [
    {
      id: '42161-1',
      symbol: 'SHIB',
      name: 'Shiba Inu',
      address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
      balance: '50000000000000',
      balanceUsd: 12.5,
      price: 0.0000125,
      change24h: -5.2,
      chainId: 42161,
    },
    {
      id: '42161-2',
      symbol: 'PEPE',
      name: 'Pepe',
      address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      balance: '1000000000000',
      balanceUsd: 8.3,
      price: 0.0000083,
      change24h: -12.4,
      chainId: 42161,
    },
    {
      id: '8453-1',
      symbol: 'MEME',
      name: 'Memecoin',
      address: '0xb131f4A55907B10d1F0A50d8ab8FA09EC342cd74',
      balance: '25000000000',
      balanceUsd: 15.0,
      price: 0.0006,
      change24h: -8.7,
      chainId: 8453,
    },
    {
      id: '8453-2',
      symbol: 'DOGE',
      name: 'Dogecoin',
      address: '0x4206931337dc273a630d328dA6441786BfaD668f',
      balance: '100000000000',
      balanceUsd: 7.5,
      price: 0.075,
      change24h: -3.2,
      chainId: 8453,
    },
  ];

  // Filter by threshold
  return mockTokens.filter((token) => token.balanceUsd >= threshold);
}
