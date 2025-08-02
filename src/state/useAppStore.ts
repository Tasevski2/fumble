import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { AppState, Token, WalletAddress, SwipeAction, SessionData, OrderIntent } from '@/types'

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Wallet addresses
      addresses: [],
      addAddress: (address: string) => {
        const newAddress: WalletAddress = {
          id: Date.now().toString(),
          address,
          isValid: true,
          isConnected: false,
        }
        set((state) => ({
          addresses: [...state.addresses, newAddress],
        }))
      },
      removeAddress: (id: string) => {
        set((state) => ({
          addresses: state.addresses.filter((addr) => addr.id !== id),
        }))
      },
      updateAddress: (id: string, updates: Partial<WalletAddress>) => {
        set((state) => ({
          addresses: state.addresses.map((addr) =>
            addr.id === id ? { ...addr, ...updates } : addr
          ),
        }))
      },

      // Threshold
      trashThreshold: 5,
      setTrashThreshold: (threshold: number) => {
        set({ trashThreshold: threshold })
      },

      // Tokens
      tokens: [],
      setTokens: (tokens: Token[]) => {
        set({ tokens, currentTokenIndex: 0 })
      },

      // Swiping
      currentTokenIndex: 0,
      swipeActions: [],
      dumpTokens: [],
      keepTokens: [],
      
      swipeToken: (tokenId: string, action: 'dump' | 'keep') => {
        const state = get()
        const token = state.tokens.find((t) => t.id === tokenId)
        if (!token) return

        const swipeAction: SwipeAction = {
          tokenId,
          action,
          timestamp: Date.now(),
        }

        set({
          swipeActions: [...state.swipeActions, swipeAction],
          dumpTokens: action === 'dump' 
            ? [...state.dumpTokens, token]
            : state.dumpTokens,
          keepTokens: action === 'keep'
            ? [...state.keepTokens, token]
            : state.keepTokens,
        })
      },

      nextToken: () => {
        set((state) => ({
          currentTokenIndex: Math.min(
            state.currentTokenIndex + 1,
            state.tokens.length - 1
          ),
        }))
      },

      // Loading states
      isScanning: false,
      setIsScanning: (scanning: boolean) => {
        set({ isScanning: scanning })
      },

      // Sessions
      sessions: {},
      setSessions: (sessions: Record<number, SessionData>) => {
        set({ sessions })
      },
      updateSession: (chainId: number, data: Partial<SessionData>) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [chainId]: {
              ...state.sessions[chainId],
              ...data,
            },
          },
        }))
      },

      // Orders
      orders: [],
      addOrder: (order: OrderIntent) => {
        set((state) => ({
          orders: [...state.orders, order],
        }))
      },
      updateOrder: (orderId: string, updates: Partial<OrderIntent>) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId ? { ...order, ...updates } : order
          ),
        }))
      },
    }),
    {
      name: 'fumble-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential data for mobile PWA
        addresses: state.addresses,        // User's wallet addresses
        trashThreshold: state.trashThreshold, // User preference
        sessions: state.sessions,          // Required for gasless transactions
        // Transient data kept in memory only:
        // - swipeActions: cleared on app restart
        // - dumpTokens: cleared on app restart
        // - keepTokens: cleared on app restart
        // - orders: cleared on app restart
      }),
    }
  )
)