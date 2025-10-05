'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestApiPage() {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const testBackendConnection = async () => {
        setLoading(true);
        try {
            // Test backend connection
            const response = await fetch('http://localhost:4000/api/auth/profile');
            const data = await response.text();
            setResult({
                status: response.status,
                data: data,
                success: response.ok
            });
        } catch (error: any) {
            setResult({
                error: error.message,
                success: false
            });
        } finally {
            setLoading(false);
        }
    };

    const testGitHubApi = async () => {
        setLoading(true);
        try {
            // Test GitHub API
            const response = await fetch('http://localhost:4000/api/github/account');
            const data = await response.text();
            setResult({
                status: response.status,
                data: data,
                success: response.ok
            });
        } catch (error: any) {
            setResult({
                error: error.message,
                success: false
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>API Connection Test</CardTitle>
                        <CardDescription>
                            Test if the backend API is accessible from the frontend
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4">
                            <Button 
                                onClick={testBackendConnection}
                                disabled={loading}
                            >
                                Test Backend Connection
                            </Button>
                            <Button 
                                onClick={testGitHubApi}
                                disabled={loading}
                                variant="outline"
                            >
                                Test GitHub API
                            </Button>
                        </div>

                        {result && (
                            <div className="mt-4 p-4 bg-gray-100 rounded-md">
                                <h3 className="font-medium mb-2">Result:</h3>
                                <pre className="text-sm overflow-auto">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}











