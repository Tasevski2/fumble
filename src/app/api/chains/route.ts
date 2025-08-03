import { NextResponse } from 'next/server';
import { CHAINS, ACTIVE_CHAIN_IDS, getUSDCAddress } from '@/config/chains';

export async function GET() {
  const enabledChains = Object.values(CHAINS)
    .filter(chain => ACTIVE_CHAIN_IDS.includes(chain.chainId))
    .map(chain => ({
      id: chain.chainId,
      name: chain.name,
      symbol: chain.symbol,
      enabled: true,
      usdcAddress: getUSDCAddress(chain.chainId),
      verifyingContract: chain.oneInch.verifyingContract,
    }));

  return NextResponse.json({ 
    chains: enabledChains,
    activeChainIds: ACTIVE_CHAIN_IDS
  });
}