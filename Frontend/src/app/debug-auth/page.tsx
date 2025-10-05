'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ApiService } from '@/lib/api';
import { useState } from 'react';

export default function DebugAuthPage() {
    const { user, token, loading } = useAuth();
    const [testResult, setTestResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const testGitHubAccount = async () => {
        try {
            setError(null);
            const apiService = new ApiService();
            const result = await apiService.request('GET', '/api/github/account');
            setTestResult(result);
        } catch (err: any) {
            setError(err.message);
            setTestResult(null);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Debug Authentication</h1>
            
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Auth State:</h2>
                    <p>User: {user ? JSON.stringify(user) : 'Not logged in'}</p>
                    <p>Token: {token ? `${token.substring(0, 20)}...` : 'No token'}</p>
                    <p>Loading: {loading ? 'Yes' : 'No'}</p>
                </div>

                <div>
                    <button 
                        onClick={testGitHubAccount}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        Test GitHub Account API
                    </button>
                </div>

                {testResult && (
                    <div>
                        <h2 className="text-lg font-semibold">GitHub Account Result:</h2>
                        <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(testResult, null, 2)}</pre>
                    </div>
                )}

                {error && (
                    <div>
                        <h2 className="text-lg font-semibold text-red-600">Error:</h2>
                        <p className="text-red-600">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}











