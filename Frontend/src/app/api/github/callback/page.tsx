'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiService } from '@/lib/api'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function GitHubCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
        'loading'
    )
    const [message, setMessage] = useState('')

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const code = searchParams.get('code')
                const error = searchParams.get('error')
                const state = searchParams.get('state')
                const connected = searchParams.get('connected')

                if (error) {
                    setStatus('error')
                    setMessage(`GitHub OAuth error: ${error}`)
                    return
                }

                if (!code) {
                    // Support backend-handled flow: either redirected with connected=1
                    // or account already exists for this user
                    if (connected === '1') {
                        setStatus('success')
                        setMessage('GitHub account connected successfully!')
                        setTimeout(() => {
                            router.push('/github')
                        }, 1500)
                        return
                    }
                    try {
                        await apiService.get('/api/github/account')
                        setStatus('success')
                        setMessage('GitHub account connected successfully!')
                        setTimeout(() => {
                            router.push('/github')
                        }, 1500)
                        return
                    } catch (_) {
                        setStatus('error')
                        setMessage('No authorization code received from GitHub')
                        return
                    }
                }

                // Send code to backend for token exchange using authenticated request
                const response = await apiService.post('/api/github/callback', { code, state })

                if (response && (response as any).message) {
                    setStatus('success')
                    setMessage('GitHub account connected successfully!')

                    // Redirect to GitHub page after 2 seconds
                    setTimeout(() => {
                        router.push('/github')
                    }, 2000)
                } else {
                    setStatus('error')
                    setMessage('Failed to connect GitHub account')
                }
            } catch (err: any) {
                setStatus('error')
                setMessage(err.message || 'An unexpected error occurred')
            }
        }

        handleCallback()
    }, [searchParams, router])

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                        {status === 'loading' && (
                            <RefreshCw className="h-6 w-6 animate-spin" />
                        )}
                        {status === 'success' && (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        )}
                        {status === 'error' && (
                            <XCircle className="h-6 w-6 text-red-600" />
                        )}
                        GitHub Connection
                    </CardTitle>
                    <CardDescription>
                        {status === 'loading' &&
                            'Connecting your GitHub account...'}
                        {status === 'success' && 'Successfully connected!'}
                        {status === 'error' && 'Connection failed'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status === 'loading' && (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-sm text-gray-600">
                                Please wait while we connect your GitHub
                                account...
                            </p>
                        </div>
                    )}

                    {status === 'success' && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    )}

                    {status === 'error' && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex gap-2">
                        <Button
                            onClick={() => router.push('/github')}
                            className="flex-1"
                        >
                            Go to GitHub Integration
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/')}
                        >
                            Back to Scanner
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
