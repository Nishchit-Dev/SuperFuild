'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, ExternalLink, Shield, CheckCircle } from 'lucide-react';
import { apiConfig } from '@/lib/api-config';

interface GitHubAccount {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  connectedAt: string;
}

interface GitHubConnectProps {
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function GitHubConnect({ onConnect, onDisconnect }: GitHubConnectProps) {
  const [githubAccount, setGithubAccount] = useState<GitHubAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkGitHubConnection();
  }, []);

  const checkGitHubConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiConfig.endpoints.github.account);
      
      if (response.ok) {
        const account = await response.json();
        setGithubAccount(account);
      } else {
        setGithubAccount(null);
      }
    } catch (err) {
      setError('Failed to check GitHub connection');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to GitHub OAuth
    window.location.href = apiConfig.endpoints.github.auth;
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiConfig.endpoints.github.disconnect, {
        method: 'POST'
      });

      if (response.ok) {
        setGithubAccount(null);
        onDisconnect();
      } else {
        setError('Failed to disconnect GitHub account');
      }
    } catch (err) {
      setError('Failed to disconnect GitHub account');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Checking GitHub connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (githubAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Connected
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardTitle>
          <CardDescription>
            Your GitHub account is connected and ready for repository scanning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <img 
              src={githubAccount.avatarUrl} 
              alt={githubAccount.username}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <p className="font-medium">{githubAccount.displayName || githubAccount.username}</p>
              <p className="text-sm text-gray-500">@{githubAccount.username}</p>
              <p className="text-xs text-gray-400">
                Connected on {new Date(githubAccount.connectedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => window.location.href = '/repositories'}
              className="flex-1"
            >
              <Shield className="h-4 w-4 mr-2" />
              View Repositories
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDisconnect}
              disabled={loading}
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Connect GitHub
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to scan repositories for security vulnerabilities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Scan private and public repositories
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-500" />
            AI-powered vulnerability detection
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Detailed security reports and fixes
          </div>
        </div>

        <Button 
          onClick={handleConnect}
          className="w-full"
          disabled={loading}
        >
          <Github className="h-4 w-4 mr-2" />
          Connect GitHub Account
        </Button>

        <p className="text-xs text-gray-500 text-center">
          We only request read access to your repositories. Your code never leaves your GitHub account.
        </p>
      </CardContent>
    </Card>
  );
}
