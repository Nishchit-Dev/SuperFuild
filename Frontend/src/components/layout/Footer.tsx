'use client'
import Link from 'next/link'
import { 
    Shield, 
    Github, 
    Twitter, 
    Linkedin, 
    Mail, 
    ExternalLink,
    Code,
    Lock,
    Zap
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    const footerLinks = {
        product: [
            { name: 'Features', href: '#features' },
            { name: 'Security', href: '#security' },
            { name: 'Pricing', href: '#pricing' },
            { name: 'API', href: '#api' },
        ],
        company: [
            { name: 'About', href: '#about' },
            { name: 'Blog', href: '#blog' },
            { name: 'Careers', href: '#careers' },
            { name: 'Contact', href: '#contact' },
        ],
        resources: [
            { name: 'Documentation', href: '#docs' },
            { name: 'Help Center', href: '#help' },
            { name: 'Community', href: '#community' },
            { name: 'Status', href: '#status' },
        ],
        legal: [
            { name: 'Privacy Policy', href: '#privacy' },
            { name: 'Terms of Service', href: '#terms' },
            { name: 'Cookie Policy', href: '#cookies' },
            { name: 'GDPR', href: '#gdpr' },
        ],
    }

    const socialLinks = [
        { name: 'GitHub', href: '#', icon: Github },
        { name: 'Twitter', href: '#', icon: Twitter },
        { name: 'LinkedIn', href: '#', icon: Linkedin },
        { name: 'Email', href: 'mailto:contact@aisecure.com', icon: Mail },
    ]

    const features = [
        { icon: Code, text: 'Multi-language support' },
        { icon: Lock, text: 'Enterprise security' },
        { icon: Zap, text: 'Real-time scanning' },
    ]

    return (
        <footer className="bg-gray-900 text-white">
            {/* Main Footer Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
                    {/* Brand Section */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <Link href="/" className="flex items-center space-x-2 group mb-4">
                                <motion.div
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <Shield className="h-8 w-8 text-blue-400" />
                                </motion.div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold group-hover:text-blue-400 transition-colors">
                                        AISecure
                                    </span>
                                    <span className="text-sm text-gray-400">AI Security Scanner</span>
                                </div>
                            </Link>
                            
                            <p className="text-gray-400 mb-6 max-w-md">
                                Advanced AI-powered security scanning for your code repositories. 
                                Detect vulnerabilities, security flaws, and code issues automatically.
                            </p>

                            {/* Feature highlights */}
                            <div className="space-y-2">
                                {features.map((feature, index) => (
                                    <motion.div
                                        key={feature.text}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex items-center space-x-2 text-sm text-gray-400"
                                    >
                                        <feature.icon className="h-4 w-4 text-blue-400" />
                                        <span>{feature.text}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Links Sections */}
                    
                </div>

                {/* Social Links */}
                <motion.div
                    className="border-t border-gray-800 mt-12 pt-8"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex space-x-6 mb-4 md:mb-0">
                            {socialLinks.map((social, index) => (
                                <motion.a
                                    key={social.name}
                                    href={social.href}
                                    className="text-gray-400 hover:text-blue-400 transition-colors duration-200"
                                    whileHover={{ scale: 1.2, rotate: 5 }}
                                    whileTap={{ scale: 0.9 }}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <social.icon className="h-5 w-5" />
                                    <span className="sr-only">{social.name}</span>
                                </motion.a>
                            ))}
                        </div>
                        
                        <div className="text-sm text-gray-400">
                            © {currentYear} AISecure. All rights reserved.
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Bar */}
            <motion.div
                className="border-t border-gray-800 bg-gray-950"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
                        <div className="flex items-center space-x-4 mb-2 md:mb-0">
                            <span>Made with ❤️ for developers</span>
                            <span>•</span>
                            <span>Powered by AI</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span>Version 1.0.0</span>
                            <span>•</span>
                            <span>Last updated: {new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </footer>
    )
}
