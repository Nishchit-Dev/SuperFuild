'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PullRequest, PRSecuritySummary } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft,
  GitPullRequest, 
  User, 
  GitBranch, 
  Clock, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';

export default function PRDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const prId = parseInt(params.prId as string);
  
  const [pr, setPR] = useState<PullRequest | null>(null);
  const [securitySummary, setSecuritySummary] = useState<PRSecuritySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load PR details
  const loadPRDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { apiService } = await import('@/lib/api');
      const [prData, summaryData] = await Promise.all([
        apiService.getPullRequestDetails(prId),
        apiService.getPRSecuritySummary(prId)
      ]);
      
      setPR(prData);
      setSecuritySummary(summaryData);
    } catch (err) {
      console.error('Failed to load PR details:', err);
      setError('Failed to load PR details');
    } finally {
      setLoading(false);
    }
  };

  // Start PR scan
  const handleScan = async () => {
    try {
      setScanning(true);
      const { apiService } = await import('@/lib/api');
      const response = await apiService.startPRScan(prId);
      
      // Redirect to scan results
      router.push(`/pr/scan/${response.prScanJobId}`);
    } catch (err) {
      console.error('Failed to start PR scan:', err);
    } finally {
      setScanning(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (prId) {
      loadPRDetails();
    }
  }, [prId]);

  const getStatusIcon = () => {
    if (!pr) return null;
    
    switch (pr.status) {
      case 'open':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'closed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <GitPullRequest className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    if (!pr) return '';
    
    switch (pr.status) {
      case 'open':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'approve':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'block':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading PR details...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {error || 'Pull Request Not Found'}
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {error || 'The requested pull request could not be found or you may not have access to it.'}
            </p>
            <Button onClick={() => router.push('/pr')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to PR List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/pr')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {pr.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <Badge className={getStatusColor()}>
                    #{pr.github_pr_id}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{pr.author_username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span>{pr.head_branch} → {pr.base_branch}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{formatDate(pr.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Summary */}
        {securitySummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Security Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-3xl font-bold text-red-600 mb-1">
                      {securitySummary.total_vulnerabilities_added}
                    </div>
                    <div className="text-sm text-red-700">Vulnerabilities Added</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {securitySummary.total_vulnerabilities_fixed}
                    </div>
                    <div className="text-sm text-green-700">Vulnerabilities Fixed</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {securitySummary.security_score_after}/100
                    </div>
                    <div className="text-sm text-blue-700">Security Score</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-3xl font-bold text-yellow-600 mb-1">
                      {securitySummary.critical_added}
                    </div>
                    <div className="text-sm text-yellow-700">Critical Issues</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Recommendation:</span>
                    <Badge className={getRecommendationColor(securitySummary.recommendation)}>
                      {securitySummary.recommendation.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Score Change: {securitySummary.security_score_after - securitySummary.security_score_before > 0 ? '+' : ''}
                    {securitySummary.security_score_after - securitySummary.security_score_before}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* PR Description */}
        {pr.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{pr.description}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center gap-4"
        >
          <Button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2"
          >
            {scanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting Scan...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Scan for Vulnerabilities
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.open(`https://github.com/${pr.author_username}/pull/${pr.github_pr_id}`, '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View on GitHub
          </Button>
        </motion.div>

        {/* Features Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <GitPullRequest className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Diff-Based Analysis
                </h3>
              </div>
              <p className="text-gray-600">
                Our AI analyzes only the changed files in your PR, providing faster and more focused security analysis.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Security Impact
                </h3>
              </div>
              <p className="text-gray-600">
                See exactly what vulnerabilities are introduced, fixed, or remain unchanged in your code changes.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
