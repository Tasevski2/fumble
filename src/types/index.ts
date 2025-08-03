export interface Token {
  id: string
  symbol: string
  name: string
  address: string
  balance: string
  balanceUsd: number
  price: number
  change24h: number
  logoUrl?: string
  chainId: number
  isSpam?: boolean
}

export interface WalletAddress {
  id: string
  address: string
  isValid: boolean
  isConnected: boolean
  chainId?: number
}

export interface SwipeAction {
  tokenId: string
  action: 'dump' | 'keep'
  timestamp: number
}

export interface ChainConfig {
  id: number
  name: string
  symbol: string
  rpcUrl: string
  blockExplorer: string
  usdcAddress: string
  oneInchProtocolAddress: string
  enabled: boolean
}

export interface SessionData {
  chainId: number
  accountAddress: `0x${string}`
  sessionKeyAddress?: `0x${string}`
  isEnabled: boolean
  isDeployed: boolean
  deploymentHash?: `0x${string}`
  expiresAt: number
}

export interface OrderIntent {
  id: string
  chainId: number
  tokenAddress: string
  tokenSymbol: string
  tokenAmount: string
  estimatedUSDC: string
  status: 'pending' | 'signing' | 'submitted' | 'executed' | 'failed' | 'expired'
  orderHash?: string
  error?: string
  timestamp: number
}

export interface AppState {
  // Wallet addresses
  addresses: WalletAddress[]
  addAddress: (address: string) => void
  removeAddress: (id: string) => void
  updateAddress: (id: string, updates: Partial<WalletAddress>) => void
  
  // Threshold
  trashThreshold: number
  setTrashThreshold: (threshold: number) => void
  
  // Tokens
  tokens: Token[]
  setTokens: (tokens: Token[]) => void
  
  // Swiping
  currentTokenIndex: number
  swipeActions: SwipeAction[]
  dumpTokens: Token[]
  keepTokens: Token[]
  swipeToken: (tokenId: string, action: 'dump' | 'keep') => void
  nextToken: () => void
  
  // Sessions & connections
  isScanning: boolean
  setIsScanning: (scanning: boolean) => void
  sessions: Record<number, SessionData>
  setSessions: (sessions: Record<number, SessionData>) => void
  updateSession: (chainId: number, data: Partial<SessionData>) => void
  
  // Orders
  orders: OrderIntent[]
  addOrder: (order: OrderIntent) => void
  updateOrder: (orderId: string, updates: Partial<OrderIntent>) => void
  
  // App state management
  resetAppState: () => void
  getTrashTokens: () => Token[]
}