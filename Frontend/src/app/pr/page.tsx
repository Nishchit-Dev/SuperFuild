'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PRList } from '@/components/pr/PRList';
import { RepositorySelector } from '@/components/pr/RepositorySelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GitPullRequest, 
  RefreshCw, 
  Plus,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  isPrivate: boolean;
  lastUpdated: string;
}

export default function PRPage() {
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Load repositories
  const loadRepositories = async () => {
    try {
      setLoading(true);
      console.log('Loading repositories...');
      const { apiService } = await import('@/lib/api');
      const response: { repositories: Repository[] } = await apiService.get('/api/github/repositories');
      console.log('API Response:', response);
      console.log('Repositories:', response.repositories);
      
      setRepositories(response.repositories || []);
      
      // Auto-select first repository if available
      if (response.repositories && response.repositories.length > 0) {
        setSelectedRepo(response.repositories[0]);
        console.log('Auto-selected repository:', response.repositories[0]);
      }
    } catch (error) {
      console.error('Failed to load repositories:', error);
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  };

  // Sync PRs for selected repository
  const syncPRs = async () => {
    if (!selectedRepo) return;
    
    try {
      setSyncing(true);
      const { apiService } = await import('@/lib/api');
      const response = await apiService.syncPullRequests(selectedRepo.id);
      console.log('PRs synced:', response);
    } catch (error) {
      console.error('Failed to sync PRs:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Handle PR selection
  const handlePRSelect = (prId: number) => {
    router.push(`/pr/${prId}`);
  };

  // Handle PR scan
  const handlePRScan = (prId: number) => {
    router.push(`/pr/scan/${prId}`);
  };

  // Load data on mount
  useEffect(() => {
    loadRepositories();
  }, []);

  // Auto-sync PRs when repository is selected
  useEffect(() => {
    if (selectedRepo && !syncing) {
      console.log('Auto-syncing PRs for selected repository:', selectedRepo.fullName);
      syncPRs();
    }
  }, [selectedRepo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-gray-600">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading repositories...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <GitPullRequest className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              No Repositories Connected
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Connect your GitHub repositories to start scanning pull requests for security vulnerabilities.
            </p>
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Debug Info:</strong> {repositories.length} repositories found. 
                Make sure you're connected to GitHub and have repositories synced.
              </p>
            </div>
            <Button 
              onClick={() => router.push('/github')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Connect GitHub Repository
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Pull Request Security Scanning
            </h1>
            <p className="text-lg text-gray-600">
              Scan your pull requests for security vulnerabilities and get detailed analysis of code changes.
            </p>
          </motion.div>
        </div>

        {/* Repository Selection */}
        <RepositorySelector
          repositories={repositories}
          selectedRepo={selectedRepo}
          onRepoSelect={setSelectedRepo}
          syncing={syncing}
          loading={loading}
        />

        {/* PR List */}
        {selectedRepo ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <PRList
              repositoryId={selectedRepo.id}
              onPRSelect={handlePRSelect}
              onPRScan={handlePRScan}
            />
          </motion.div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a Repository
              </h3>
              <p className="text-gray-600">
                Choose a repository from the dropdown above to view and scan its pull requests.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Features Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <GitPullRequest className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Diff-Based Scanning
              </h3>
              <p className="text-gray-600">
                Only scan changed files, not entire repositories. Faster and more focused analysis.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Before/After Analysis
              </h3>
              <p className="text-gray-600">
                See what vulnerabilities are added, fixed, or remain unchanged in your PRs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Security Gates
              </h3>
              <p className="text-gray-600">
                Get approve/review/block recommendations based on security impact.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
