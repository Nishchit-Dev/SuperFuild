'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Github, Shield } from 'lucide-react';
import Link from 'next/link';

export default function SimpleGitHubPage() {
    const [githubConnected, setGithubConnected] = useState(false);

    const handleGitHubConnect = () => {
        setGithubConnected(true);
        console.log('GitHub connect clicked');
    };

    const handleGitHubDisconnect = () => {
        setGithubConnected(false);
        console.log('GitHub disconnect clicked');
    };

    const handleScanRepository = (repoId: number) => {
        console.log('Scanning repository:', repoId);
    };

    const handleRefreshRepositories = () => {
        console.log('Refreshing repositories...');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Scanner
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Github className="h-8 w-8" />
                            GitHub Integration
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Connect your GitHub account to scan repositories for security vulnerabilities
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* GitHub Connection Card */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Github className="h-5 w-5" />
                                    Connect GitHub
                                </CardTitle>
                                <CardDescription>
                                    Connect your GitHub account to scan repositories
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {githubConnected ? (
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Github className="h-6 w-6 text-green-600" />
                                        </div>
                                        <p className="font-medium text-green-900 mb-2">GitHub Connected!</p>
                                        <Button 
                                            variant="outline" 
                                            onClick={handleGitHubDisconnect}
                                            className="w-full"
                                        >
                                            Disconnect
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Github className="h-6 w-6 text-gray-600" />
                                        </div>
                                        <p className="text-gray-600 mb-4">
                                            Connect your GitHub account to get started
                                        </p>
                                        <Button 
                                            onClick={handleGitHubConnect}
                                            className="w-full"
                                        >
                                            <Github className="h-4 w-4 mr-2" />
                                            Connect GitHub Account
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Repository List */}
                    <div className="lg:col-span-2">
                        {githubConnected ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Your Repositories</CardTitle>
                                    <CardDescription>
                                        Select a repository to scan for security vulnerabilities
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-8">
                                        <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            No Repositories Found
                                        </h3>
                                        <p className="text-gray-500 mb-4">
                                            This is a simplified version. Real repositories will appear here.
                                        </p>
                                        <Button 
                                            variant="outline"
                                            onClick={handleRefreshRepositories}
                                        >
                                            Refresh Repositories
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Connect GitHub to Get Started
                                    </h3>
                                    <p className="text-gray-500">
                                        Connect your GitHub account to see your repositories and start scanning for security vulnerabilities.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}











