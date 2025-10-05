'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AuthPage from '../auth/page'
import { apiConfig } from '@/lib/api-config'
import { apiService } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    ArrowLeft,
    Github,
    Shield,
    CheckCircle,
    ExternalLink,
    GitPullRequest,
} from 'lucide-react'
import Link from 'next/link'

export default function GitHubPage() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <AuthPage />
    }

    return (
        <ProtectedRoute>
            <GitHubPageContent />
        </ProtectedRoute>
    )
}

type GitHubAccount = {
    id: number
    username: string
    displayName?: string
    avatarUrl?: string
    connectedAt: string
}

type Repository = {
    id: number
    name: string
    fullName: string
    description?: string | null
    language?: string | null
    isPrivate: boolean
    defaultBranch?: string
    htmlUrl: string
    lastUpdated: string
}

type ScanStartResponse = {
    message: string
    scanJobId: number
    status: string
}

type ScanHistoryItem = {
    id: number
    status: string
    scanType: string
    targetBranch: string
    startedAt: string
    completedAt?: string | null
    repository: { name: string; fullName: string }
}

function GitHubPageContent() {
    const [githubConnected, setGithubConnected] = useState(false)
    const [githubAccount, setGithubAccount] = useState<GitHubAccount | null>(
        null
    )
    const [repositories, setRepositories] = useState<Repository[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([])
    const { token } = useAuth()

    useEffect(() => {
        checkGitHubConnection()
    }, [token])

    // Auto-refresh scan history when connected
    useEffect(() => {
        if (!githubConnected) return

        const interval = setInterval(() => {
            loadScanHistory()
        }, 5000) // Refresh every 5 seconds

        return () => clearInterval(interval)
    }, [githubConnected])

    const checkGitHubConnection = async () => {
        try {
            setLoading(true)
            setError(null)

            const account = await apiService.get<GitHubAccount>(
                '/api/github/account'
            )

            setGithubAccount(account)
            setGithubConnected(true)

            // Fetch repositories when connected
            await loadRepositories()
            await loadScanHistory()
        } catch (err: any) {
            if (err.status === 404) {
                // GitHub account not connected
                setGithubAccount(null)
                setGithubConnected(false)
                setRepositories([])
                setScanHistory([])
            } else {
                setError('Failed to check GitHub connection')
                setGithubConnected(false)
            }
        } finally {
            setLoading(false)
        }
    }

    const loadRepositories = async () => {
        try {
            const response = await apiService.get<{
                repositories: Repository[]
            }>('/api/github/repositories')
            setRepositories(response.repositories || [])
        } catch (err: any) {
            console.error('Failed to load repositories:', err)
            setRepositories([])
        }
    }

    const loadScanHistory = async () => {
        try {
            const resp = await apiService.get<{
                scans: ScanHistoryItem[]
                pagination: { page: number; limit: number; total: number }
            }>(`/api/github/scans?page=1&limit=10`)
            setScanHistory(resp.scans || [])
        } catch (err: any) {
            console.error('Failed to load scan history:', err)
            setScanHistory([])
        }
    }

    const handleGitHubConnect = () => {
        // Redirect to GitHub OAuth
        window.location.href = apiConfig.endpoints.github.auth
    }

    const handleGitHubDisconnect = async () => {
        try {
            setLoading(true)
            await apiService.post('/api/github/disconnect')

            setGithubAccount(null)
            setGithubConnected(false)
        } catch (err: any) {
            setError('Failed to disconnect GitHub account')
        } finally {
            setLoading(false)
        }
    }

    const handleRefreshRepositories = async () => {
        try {
            setLoading(true)
            await apiService.post('/api/github/repositories/sync')
            await loadRepositories()
        } catch (err: any) {
            setError('Failed to refresh repositories')
        } finally {
            setLoading(false)
        }
    }

    const handleScanRepository = async (repoId: number) => {
        try {
            setLoading(true)
            const response = await apiService.post<ScanStartResponse>(
                '/api/github/scan',
                {
                    repositoryId: repoId,
                    scanType: 'full',
                }
            )

            // Navigate to the scan status page
            window.location.href = `/github/scan/${response.scanJobId}`
        } catch (err: any) {
            setError('Failed to start scan')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex  justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                <Github className="h-8 w-8" />
                                GitHub Integration
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Connect your GitHub account to scan repositories
                                for security vulnerabilities
                            </p>
                        </div>
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
                                    Connect your GitHub account to scan
                                    repositories
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertDescription>
                                            {error}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {loading ? (
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                        <p className="text-gray-600">
                                            Checking GitHub connection...
                                        </p>
                                    </div>
                                ) : githubConnected ? (
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CheckCircle className="h-6 w-6 text-green-600" />
                                        </div>
                                        <p className="font-medium text-green-900 mb-2">
                                            GitHub Connected!
                                        </p>
                                        {githubAccount && (
                                            <div className="text-sm text-gray-600 mb-3">
                                                <p>@{githubAccount.username}</p>
                                                <p className="text-xs text-gray-500">
                                                    Connected on{' '}
                                                    {new Date(
                                                        githubAccount.connectedAt
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={handleGitHubDisconnect}
                                            className="w-full"
                                            disabled={loading}
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
                                            Connect your GitHub account to get
                                            started
                                        </p>
                                        <Button
                                            onClick={handleGitHubConnect}
                                            className="w-full"
                                            disabled={loading}
                                        >
                                            <Github className="h-4 w-4 mr-2" />
                                            Connect GitHub Account
                                        </Button>
                                        <p className="text-xs text-gray-400 mt-2">
                                            You'll be redirected to GitHub to
                                            authorize the connection
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Scan History */}
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    Recent Scans
                                </CardTitle>
                                <CardDescription>
                                    Last 10 scans for your repositories
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {githubConnected ? (
                                    scanHistory.length === 0 ? (
                                        <div className="text-sm text-gray-500">
                                            No scans yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {scanHistory.map((scan) => (
                                                <div
                                                    key={scan.id}
                                                    className="border rounded-lg p-3"
                                                >
                                                    <div className="flex flex-col justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-medium truncate">
                                                                {
                                                                    scan
                                                                        .repository
                                                                        .fullName
                                                                }
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {scan.scanType}{' '}
                                                                •{' '}
                                                                {
                                                                    scan.targetBranch
                                                                }{' '}
                                                                •{' '}
                                                                {new Date(
                                                                    scan.startedAt
                                                                ).toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div className="flex  items-center gap-2">
                                                            <span
                                                                className={`text-xs text-center px-2 py-1 rounded flex-1 ${
                                                                    scan.status ===
                                                                    'completed'
                                                                        ? 'bg-green-100 text-green-700'
                                                                        : scan.status ===
                                                                          'running'
                                                                        ? 'bg-blue-100 text-blue-700'
                                                                        : scan.status ===
                                                                          'failed'
                                                                        ? 'bg-red-100 text-red-700'
                                                                        : 'bg-gray-100 text-gray-700'
                                                                }`}
                                                            >
                                                                {scan.status}
                                                            </span>
                                                            <Button
                                                                className="gap-2 bg-black/80 text-white cursor-pointer text-xs p-1 w-20 h-max m-0"
                                                                onClick={() =>
                                                                    (window.location.href = `/github/scan/${scan.id}`)
                                                                }
                                                            >
                                                                View
                                                                <ExternalLink className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <div className="text-sm text-gray-500">
                                        Connect GitHub to see your scans.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* PR Scanning Section */}
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle className="flex  gap-2">
                                    <GitPullRequest className="h-15 w-15" />
                                    Pull Request Security Scanning
                                </CardTitle>
                                <CardDescription >
                                    Scan pull requests for security
                                    vulnerabilities with diff-based analysis
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {githubConnected ? (
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-4 mb-4">
                                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                                <GitPullRequest className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                                <h3 className="font-semibold text-blue-900">
                                                    Diff-Based Scanning
                                                </h3>
                                                <p className="text-sm text-blue-700">
                                                    Only scan changed files
                                                </p>
                                            </div>
                                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                                <h3 className="font-semibold text-green-900">
                                                    Before/After Analysis
                                                </h3>
                                                <p className="text-sm text-green-700">
                                                    See what's new, fixed,
                                                    unchanged
                                                </p>
                                            </div>
                                            <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                                <Shield className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                                                <h3 className="font-semibold text-yellow-900">
                                                    Security Gates
                                                </h3>
                                                <p className="text-sm text-yellow-700">
                                                    Approve/review/block
                                                    recommendations
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-gray-900">
                                                    Ready to scan PRs?
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    Access the PR scanning
                                                    dashboard to view and scan
                                                    your pull requests.
                                                </p>
                                            </div>
                                            <Link href="/pr">
                                                <Button
                                                    variant="outline"
                                                    className="flex items-center gap-2"
                                                >
                                                    <GitPullRequest className="h-4 w-4" />
                                                    View PRs
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <GitPullRequest className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            Connect GitHub First
                                        </h3>
                                        <p className="text-gray-600">
                                            Connect your GitHub account to
                                            access PR scanning features.
                                        </p>
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
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <CardTitle>
                                                Your Repositories
                                            </CardTitle>
                                            <CardDescription>
                                                Select a repository to scan for
                                                security vulnerabilities
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={
                                                    handleRefreshRepositories
                                                }
                                                disabled={loading}
                                            >
                                                {loading
                                                    ? 'Syncing...'
                                                    : 'Refresh'}
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <Input
                                            placeholder="Search repositories..."
                                            value={searchQuery}
                                            onChange={(e) =>
                                                setSearchQuery(e.target.value)
                                            }
                                            className="w-full"
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {repositories.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                No Repositories Found
                                            </h3>
                                            <p className="text-gray-500 mb-4">
                                                Click "Refresh Repositories" to
                                                sync your GitHub repos.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {repositories
                                                .filter((repo) => {
                                                    const q = searchQuery
                                                        .trim()
                                                        .toLowerCase()
                                                    if (!q) return true
                                                    return (
                                                        repo.name
                                                            .toLowerCase()
                                                            .includes(q) ||
                                                        repo.fullName
                                                            .toLowerCase()
                                                            .includes(q) ||
                                                        (repo.description || '')
                                                            .toLowerCase()
                                                            .includes(q) ||
                                                        (repo.language || '')
                                                            .toLowerCase()
                                                            .includes(q)
                                                    )
                                                })
                                                .map((repo) => (
                                                    <div
                                                        key={repo.id}
                                                        className="border rounded-lg p-4 hover:bg-gray-50"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <h4 className="font-medium text-gray-900">
                                                                    {repo.name}
                                                                </h4>
                                                                <p className="text-sm text-gray-500">
                                                                    {
                                                                        repo.fullName
                                                                    }
                                                                </p>
                                                                {repo.description && (
                                                                    <p className="text-sm text-gray-600 mt-1">
                                                                        {
                                                                            repo.description
                                                                        }
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center gap-4 mt-2">
                                                                    {repo.language && (
                                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                            {
                                                                                repo.language
                                                                            }
                                                                        </span>
                                                                    )}
                                                                    <span className="text-xs text-gray-500">
                                                                        {repo.isPrivate
                                                                            ? 'Private'
                                                                            : 'Public'}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        Updated{' '}
                                                                        {new Date(
                                                                            repo.lastUpdated
                                                                        ).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleScanRepository(
                                                                            repo.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        loading
                                                                    }
                                                                >
                                                                    <Shield className="h-4 w-4 mr-1" />
                                                                    Scan
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        window.open(
                                                                            repo.htmlUrl,
                                                                            '_blank'
                                                                        )
                                                                    }
                                                                >
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            {searchQuery &&
                                                repositories.filter((repo) => {
                                                    const q = searchQuery
                                                        .trim()
                                                        .toLowerCase()
                                                    return (
                                                        repo.name
                                                            .toLowerCase()
                                                            .includes(q) ||
                                                        repo.fullName
                                                            .toLowerCase()
                                                            .includes(q) ||
                                                        (repo.description || '')
                                                            .toLowerCase()
                                                            .includes(q) ||
                                                        (repo.language || '')
                                                            .toLowerCase()
                                                            .includes(q)
                                                    )
                                                }).length === 0 && (
                                                    <div className="text-center py-8 text-sm text-gray-500">
                                                        No repositories match "
                                                        {searchQuery}"
                                                    </div>
                                                )}
                                        </div>
                                    )}
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
                                        Connect your GitHub account to see your
                                        repositories and start scanning for
                                        security vulnerabilities.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                GitHub Security Scanning Features
                            </CardTitle>
                            <CardDescription>
                                Powerful security analysis for your entire
                                codebase
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                                        <Github className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <h3 className="font-semibold mb-2">
                                        Repository Access
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Scan both private and public
                                        repositories with secure OAuth
                                        integration
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                                        <Shield className="h-6 w-6 text-green-600" />
                                    </div>
                                    <h3 className="font-semibold mb-2">
                                        AI-Powered Analysis
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Advanced AI detects vulnerabilities
                                        across multiple programming languages
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                                        <Shield className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <h3 className="font-semibold mb-2">
                                        Detailed Reports
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Get comprehensive security reports with
                                        fix suggestions and best practices
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
