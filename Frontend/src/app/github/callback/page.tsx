'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function GitHubCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const code = searchParams.get('code');
                const error = searchParams.get('error');
                const state = searchParams.get('state');

                if (error) {
                    setStatus('error');
                    setMessage(`GitHub OAuth error: ${error}`);
                    return;
                }

                if (!code) {
                    setStatus('error');
                    setMessage('No authorization code received from GitHub');
                    return;
                }

                // Send code to backend for token exchange
                const response = await fetch('/api/github/callback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code, state }),
                });

                if (response.ok) {
                    setStatus('success');
                    setMessage('GitHub account connected successfully!');
                    
                    // Redirect to GitHub page after 2 seconds
                    setTimeout(() => {
                        router.push('/github');
                    }, 2000);
                } else {
                    const errorData = await response.json();
                    setStatus('error');
                    setMessage(errorData.error || 'Failed to connect GitHub account');
                }
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'An unexpected error occurred');
            }
        };

        handleCallback();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                        {status === 'loading' && <RefreshCw className="h-6 w-6 animate-spin" />}
                        {status === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
                        {status === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
                        GitHub Connection
                    </CardTitle>
                    <CardDescription>
                        {status === 'loading' && 'Connecting your GitHub account...'}
                        {status === 'success' && 'Successfully connected!'}
                        {status === 'error' && 'Connection failed'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status === 'loading' && (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-sm text-gray-600">
                                Please wait while we connect your GitHub account...
                            </p>
                        </div>
                    )}

                    {status === 'success' && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                                {message}
                            </AlertDescription>
                        </Alert>
                    )}

                    {status === 'error' && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                                {message}
                            </AlertDescription>
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
    );
}

