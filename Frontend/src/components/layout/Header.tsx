'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
    Shield, 
    Github, 
    Menu, 
    X, 
    User,
    LogOut,
    Home,
    Search,
    GitPullRequest,
    Eye
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Header() {
    const { user, logout } = useAuth()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const navigation = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'GitHub Integration', href: '/github', icon: Github },
        { name: 'Pull Requests', href: '/pr', icon: GitPullRequest },
        { name: 'Repository Watching', href: '/watching', icon: Eye },
    ]

    return (
        <motion.header 
            className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="max-8xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2 group">
                        <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Shield className="h-8 w-8 text-blue-600" />
                        </motion.div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                AISecure
                            </span>
                            <Badge variant="secondary" className="text-xs px-1 py-0 w-fit">
                                AI Security
                            </Badge>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
                            >
                                <item.icon className="h-4 w-4" />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* User Menu / Auth Buttons */}
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <div className="flex items-center space-x-3">
                                <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                                    <User className="h-4 w-4" />
                                    <span>Welcome, {user.firstName || user.email}</span>
                                </div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button 
                                        onClick={logout} 
                                        variant="outline" 
                                        size="sm"
                                        className="flex items-center space-x-2"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span className="hidden sm:inline">Logout</span>
                                    </Button>
                                </motion.div>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Link href="/auth">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button variant="outline" size="sm">
                                            Sign In
                                        </Button>
                                    </motion.div>
                                </Link>
                                <Link href="/auth">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button size="sm">
                                            Get Started
                                        </Button>
                                    </motion.div>
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <button
                            className="md:hidden p-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="md:hidden border-t border-gray-200 bg-white"
                        >
                            <div className="px-2 pt-2 pb-3 space-y-1">
                                {navigation.map((item, index) => (
                                    <motion.div
                                        key={item.name}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <Link
                                            href={item.href}
                                            className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span className="font-medium">{item.name}</span>
                                        </Link>
                                    </motion.div>
                                ))}
                                
                                {user && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: navigation.length * 0.1 }}
                                        className="border-t border-gray-200 pt-3 mt-3"
                                    >
                                        <div className="px-3 py-2 text-sm text-gray-600">
                                            <div className="flex items-center space-x-2">
                                                <User className="h-4 w-4" />
                                                <span>{user.firstName || user.email}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                logout()
                                                setIsMobileMenuOpen(false)
                                            }}
                                            className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors w-full"
                                        >
                                            <LogOut className="h-5 w-5" />
                                            <span className="font-medium">Logout</span>
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.header>
    )
}
