'use client'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

export default function Loading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="mb-4"
                >
                    <Shield className="h-12 w-12 text-blue-600 mx-auto" />
                </motion.div>
                <motion.h2
                    className="text-xl font-semibold text-gray-900 mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    Loading AISecure...
                </motion.h2>
                <motion.p
                    className="text-gray-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    Preparing your security scanner
                </motion.p>
            </motion.div>
        </div>
    )
}
