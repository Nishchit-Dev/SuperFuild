'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiConfig } from '@/lib/api-config';
import { 
  Github, 
  Shield, 
  Clock, 
  Star, 
  GitBranch, 
  Eye, 
  Lock,
  Play,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  language: string;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
  lastUpdated: string;
  lastScanDate?: string;
  vulnerabilityCount?: number;
}

interface RepositoryListProps {
  onScanRepository: (repoId: number) => void;
  onRefreshRepositories: () => void;
}

export default function RepositoryList({ onScanRepository, onRefreshRepositories }: RepositoryListProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanningRepos, setScanningRepos] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(apiConfig.endpoints.github.repositories);
      
      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }
      
      const data = await response.json();
      setRepositories(data.repositories || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanRepository = async (repoId: number) => {
    try {
      setScanningRepos(prev => new Set(prev).add(repoId));
      
      const response = await fetch(apiConfig.endpoints.github.scan, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repositoryId: repoId })
      });

      if (!response.ok) {
        throw new Error('Failed to start scan');
      }

      const result = await response.json();
      onScanRepository(repoId);
      
      // Show success message or redirect to scan results
      console.log('Scan started:', result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScanningRepos(prev => {
        const newSet = new Set(prev);
        newSet.delete(repoId);
        return newSet;
      });
    }
  };

  const getLanguageColor = (language: string) => {
    const colors: { [key: string]: string } = {
      'JavaScript': 'bg-yellow-100 text-yellow-800',
      'TypeScript': 'bg-blue-100 text-blue-800',
      'Python': 'bg-green-100 text-green-800',
      'Java': 'bg-orange-100 text-orange-800',
      'PHP': 'bg-purple-100 text-purple-800',
      'Go': 'bg-cyan-100 text-cyan-800',
      'Rust': 'bg-red-100 text-red-800',
      'C++': 'bg-gray-100 text-gray-800',
      'C#': 'bg-indigo-100 text-indigo-800',
    };
    return colors[language] || 'bg-gray-100 text-gray-800';
  };

  const getVulnerabilityBadge = (count: number) => {
    if (count === 0) return <Badge variant="secondary" className="bg-green-100 text-green-800">Secure</Badge>;
    if (count <= 5) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{count} issues</Badge>;
    return <Badge variant="destructive">{count} issues</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading repositories...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (repositories.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Github className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories found</h3>
          <p className="text-gray-500 mb-4">
            Connect your GitHub account to see your repositories here.
          </p>
          <Button onClick={onRefreshRepositories}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Repositories</h2>
        <Button 
          variant="outline" 
          onClick={onRefreshRepositories}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {repositories.map((repo) => (
          <Card key={repo.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Github className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-lg">{repo.name}</CardTitle>
                  {repo.isPrivate ? (
                    <Lock className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {repo.language && (
                    <Badge className={getLanguageColor(repo.language)}>
                      {repo.language}
                    </Badge>
                  )}
                  {repo.vulnerabilityCount !== undefined && getVulnerabilityBadge(repo.vulnerabilityCount)}
                </div>
              </div>
              <CardDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {repo.defaultBranch}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(repo.lastUpdated).toLocaleDateString()}
                </span>
                {repo.lastScanDate && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Shield className="h-3 w-3" />
                    Last scanned: {new Date(repo.lastScanDate).toLocaleDateString()}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {repo.description && (
                <p className="text-sm text-gray-600 mb-4">{repo.description}</p>
              )}
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleScanRepository(repo.id)}
                  disabled={scanningRepos.has(repo.id)}
                  className="flex-1"
                >
                  {scanningRepos.has(repo.id) ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Scan Repository
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open(repo.htmlUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
