import { Token } from '@/types';

const mockQuips = [
  'Bought for the ticker. Stayed for the trauma.',
  'This is what healing looks like',
  'Cope continues',
  'More bags than Louis Vuitton',
  'Diamond hands? More like paper brain',
  'HODL until death',
  'The market has spoken',
  'Rugpull survivor',
  'Degen life chose me',
  'Exit liquidity champion',
  'Portfolio therapy session',
  'Bagholder anonymous',
  'Crypto winter casualty',
  'Yield farming your dreams',
  'Smart money exit',
];

const mockTokens = [
  {
    symbol: 'SHIBX',
    name: 'Shiba X Token',
    balance: '1250000.0',
    balanceUsd: 2.31,
    price: 0.0000018,
    change24h: -43.2,
  },
  {
    symbol: 'BABYDOGE',
    name: 'Baby Doge Coin',
    balance: '89000000.0',
    balanceUsd: 0.45,
    price: 0.000000005,
    change24h: -67.8,
  },
  {
    symbol: 'SAFEMOON',
    name: 'SafeMoon',
    balance: '450000.0',
    balanceUsd: 1.23,
    price: 0.0000027,
    change24h: -89.2,
  },
  {
    symbol: 'FLOKI',
    name: 'Floki Inu',
    balance: '234000.0',
    balanceUsd: 8.91,
    price: 0.000038,
    change24h: 12.5,
  },
  {
    symbol: 'PEPE',
    name: 'Pepe',
    balance: '1890000000.0',
    balanceUsd: 45.67,
    price: 0.000000024,
    change24h: -23.1,
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    balance: '12000000.0',
    balanceUsd: 3.45,
    price: 0.0000003,
    change24h: -12.8,
  },
  {
    symbol: 'WOJAK',
    name: 'Wojak',
    balance: '67890.0',
    balanceUsd: 1.89,
    price: 0.000028,
    change24h: -78.9,
  },
  {
    symbol: 'APE',
    name: 'ApeCoin',
    balance: '12.45',
    balanceUsd: 67.23,
    price: 5.4,
    change24h: 8.2,
  },
  {
    symbol: 'SHIB',
    name: 'Shiba Inu',
    balance: '45000000.0',
    balanceUsd: 234.56,
    price: 0.0000052,
    change24h: -15.6,
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    balance: '1250.0',
    balanceUsd: 89.75,
    price: 0.0718,
    change24h: 3.4,
  },
];

export function generateMockTokens(threshold: number = 5): Token[] {
  return mockTokens.map((token, index) => ({
    id: `token-${index}`,
    symbol: token.symbol,
    name: token.name,
    address: `0x${Math.random().toString(16).substr(2, 40)}`,
    balance: token.balance,
    balanceUsd: token.balanceUsd,
    price: token.price,
    change24h: token.change24h,
    chainId: 42161, // Arbitrum
    logoUrl: `https://tokens.1inch.io/0x${Math.random()
      .toString(16)
      .substr(2, 40)}.png`,
    isSpam: token.balanceUsd < threshold,
  }));
}

export function getRandomQuip(): string {
  return mockQuips[Math.floor(Math.random() * mockQuips.length)];
}

export function formatBalance(
  balance: string | number,
  decimals: number = 18
): string {
  const num = typeof balance === 'number' ? balance : parseFloat(balance);
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(2);
}

export function formatPrice(price: number | string): string {
  const formattedPrice: number =
    typeof price === 'number' ? price : parseFloat(price);
  if (formattedPrice < 0.001) return `$${formattedPrice.toExponential(2)}`;
  if (formattedPrice < 1) return `$${formattedPrice.toFixed(6)}`;
  return `$${formattedPrice.toFixed(2)}`;
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}
