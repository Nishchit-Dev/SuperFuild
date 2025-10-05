'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
            <motion.div
                className="text-center max-w-md mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <motion.div
                    className="mb-8"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                    <Shield className="h-24 w-24 text-blue-600 mx-auto mb-4" />
                    <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                        Page Not Found
                    </h2>
                    <p className="text-gray-600 mb-8">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                </motion.div>

                <motion.div
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Link href="/">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button className="w-full sm:w-auto">
                                <Home className="h-4 w-4 mr-2" />
                                Go Home
                            </Button>
                        </motion.div>
                    </Link>
                    <motion.button
                        onClick={() => window.history.back()}
                        className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Go Back
                    </motion.button>
                </motion.div>
            </motion.div>
        </div>
    )
}
