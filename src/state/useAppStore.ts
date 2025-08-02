import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { AppState, Token, WalletAddress, SwipeAction } from '@/types'

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
    }),
    {
      name: 'fumble-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        addresses: state.addresses,
        trashThreshold: state.trashThreshold,
        swipeActions: state.swipeActions,
        dumpTokens: state.dumpTokens,
        keepTokens: state.keepTokens,
      }),
    }
  )
)