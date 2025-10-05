'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    GitPullRequest,
    Github,
    RefreshCw,
    CheckCircle,
    Lock,
    Globe,
    Search,
    X,
} from 'lucide-react'

interface Repository {
    id: number
    name: string
    fullName: string
    description?: string
    isPrivate: boolean
    lastUpdated: string
}

interface RepositorySelectorProps {
    repositories: Repository[]
    selectedRepo: Repository | null
    onRepoSelect: (repo: Repository | null) => void
    syncing: boolean
    loading: boolean
}

export function RepositorySelector({
    repositories,
    selectedRepo,
    onRepoSelect,
    syncing,
    loading,
}: RepositorySelectorProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [lastSelectedRepo, setLastSelectedRepo] = useState<Repository | null>(null)

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const getRepoIcon = (repo: Repository) => {
        return repo.isPrivate ? (
            <Lock className="h-4 w-4 text-gray-500" />
        ) : (
            <Globe className="h-4 w-4 text-gray-500" />
        )
    }

    const getRepoDescription = (repo: Repository) => {
        if (repo.description) {
            return repo.description.length > 60
                ? `${repo.description.substring(0, 60)}...`
                : repo.description
        }
        return `Last updated ${formatDate(repo.lastUpdated)}`
    }

    // Filter repositories based on search query
    const filteredRepositories = repositories.filter((repo) => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        return (
            repo.fullName.toLowerCase().includes(query) ||
            repo.name.toLowerCase().includes(query) ||
            (repo.description && repo.description.toLowerCase().includes(query))
        )
    })

    // Auto-sync when repository is selected
    const handleRepoSelect = (repo: Repository | null) => {
        console.log('Repository selected:', repo)
        onRepoSelect(repo)
        
        // Track selection for auto-sync logic
        if (repo && repo.id !== lastSelectedRepo?.id) {
            console.log('New repository selected, will auto-sync:', repo.fullName)
            setLastSelectedRepo(repo)
        } else if (!repo) {
            setLastSelectedRepo(null)
        }
    }

    if (loading) {
        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GitPullRequest className="h-5 w-5" />
                        Select Repository
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2 text-gray-600">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span>Loading repositories...</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Debug information
    if (repositories.length === 0) {
        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GitPullRequest className="h-5 w-5" />
                        Select Repository
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <Github className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Repositories Found
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Connect your GitHub account to see your
                            repositories.
                        </p>
                        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                            <strong>Debug Info:</strong>
                            <br />
                            Repositories count: {repositories.length}
                            <br />
                            Loading: {loading.toString()}
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <GitPullRequest className="h-5 w-5" />
                    Select Repository
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {selectedRepo && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    {getRepoIcon(selectedRepo)}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-blue-900 mb-1">
                                            {selectedRepo.fullName}
                                        </h4>
                                        {selectedRepo.description && (
                                            <p className="text-sm text-blue-700 mb-2">
                                                {selectedRepo.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-blue-600">
                                            <span>
                                                Updated{' '}
                                                {formatDate(
                                                    selectedRepo.lastUpdated
                                                )}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="text-xs border-blue-300 text-blue-700"
                                            >
                                                {selectedRepo.isPrivate
                                                    ? 'Private'
                                                    : 'Public'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-sm text-green-700 font-medium">
                                        Selected
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {/* Searchable Repository Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Choose a repository to scan pull requests
                        </label>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search repositories by name or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-10 pr-10 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Repository List */}
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                            {filteredRepositories.length > 0 ? (
                                filteredRepositories.map((repo) => (
                                     <div
                                         key={repo.id}
                                         onClick={() => handleRepoSelect(repo)}
                                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                                            selectedRepo?.id === repo.id
                                                ? 'bg-blue-50 border-blue-200'
                                                : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {getRepoIcon(repo)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-medium text-gray-900 truncate">
                                                        {repo.fullName}
                                                    </h4>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        {repo.isPrivate
                                                            ? 'Private'
                                                            : 'Public'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-1">
                                                    {getRepoDescription(repo)}
                                                </p>
                                                <div className="text-xs text-gray-500">
                                                    Updated{' '}
                                                    {formatDate(
                                                        repo.lastUpdated
                                                    )}
                                                </div>
                                            </div>
                                            {selectedRepo?.id === repo.id && (
                                                <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : searchQuery ? (
                                <div className="p-6 text-center text-gray-500">
                                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p>No repositories match "{searchQuery}"</p>
                                    <p className="text-sm">
                                        Try a different search term
                                    </p>
                                </div>
                            ) : (
                                <div className="p-6 text-center text-gray-500">
                                    <Github className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p>No repositories available</p>
                                </div>
                            )}
                        </div>

                        {/* Search Results Count */}
                        {searchQuery && (
                            <div className="text-xs text-gray-500">
                                {filteredRepositories.length} of{' '}
                                {repositories.length} repositories match
                            </div>
                        )}
                    </div>

                    {/* Selected Repository Info */}

                     {/* Auto-Sync Status */}
                     <div className="pt-4 border-t border-gray-200">
                         <div className="text-sm text-gray-600">
                             {selectedRepo ? (
                                 syncing ? (
                                     <span className="flex items-center gap-2">
                                         <RefreshCw className="h-4 w-4 animate-spin" />
                                         Auto-syncing PRs from {selectedRepo.fullName}...
                                     </span>
                                 ) : (
                                     <span className="flex items-center gap-2">
                                         <CheckCircle className="h-4 w-4 text-green-500" />
                                         PRs synced from {selectedRepo.fullName}
                                     </span>
                                 )
                             ) : (
                                 'Select a repository to auto-sync pull requests'
                             )}
                         </div>
                     </div>

                    {/* Next Steps Guide */}
                    {selectedRepo && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                             <h4 className="font-medium text-blue-900 mb-2">
                                 Next Steps:
                             </h4>
                             <ol className="text-sm text-blue-800 space-y-1">
                                 <li>
                                     1. PRs are automatically synced when you select a repository
                                 </li>
                                 <li>
                                     2. Browse the list of pull requests below
                                 </li>
                                 <li>
                                     3. Click "Scan PR" on any pull request to
                                     start security analysis
                                 </li>
                                 <li>
                                     4. Review the security results and
                                     recommendations
                                 </li>
                             </ol>
                        </motion.div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
