'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DebugGitHubPage() {
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
                            GitHub Integration - Debug
                        </h1>
                        <p className="text-gray-600 mt-1">
                            This is a simplified version to test navigation
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>GitHub Integration Status</CardTitle>
                        <CardDescription>
                            Testing if the GitHub page loads correctly
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8">
                            <Github className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                GitHub Page Loaded Successfully! ✅
                            </h3>
                            <p className="text-gray-500 mb-6">
                                If you can see this page, the navigation is working correctly.
                            </p>
                            
                            <div className="space-y-2">
                                <Button className="w-full">
                                    <Github className="h-4 w-4 mr-2" />
                                    Connect GitHub Account (Test)
                                </Button>
                                <p className="text-xs text-gray-400">
                                    This is a debug page - the real components will load next
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}











