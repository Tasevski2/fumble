'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/intro')
    }, 1500)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center safe-area-inset-top safe-area-inset-bottom">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
        onClick={() => router.push('/intro')}
      >
        <div className="relative">
          <div className="w-32 h-32 bg-white rounded-full mx-auto mb-8 flex items-center justify-center">
            <span className="text-6xl">💸</span>
          </div>
          <h1 className="text-6xl font-bold text-primary-foreground">fumble</h1>
        </div>
      </motion.div>
    </div>
  )
}