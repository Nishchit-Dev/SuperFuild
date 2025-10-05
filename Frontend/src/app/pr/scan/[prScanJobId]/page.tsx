'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PRScanResults } from '@/components/pr/PRScanResults';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

export default function PRScanResultsPage() {
  const params = useParams();
  const router = useRouter();
  const prScanJobId = parseInt(params.prScanJobId as string);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load scan results
  const loadScanResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { apiService } = await import('@/lib/api');
      await apiService.getPRScanResults(prScanJobId);
    } catch (err) {
      console.error('Failed to load scan results:', err);
      setError('Failed to load scan results');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (prScanJobId) {
      loadScanResults();
    }
  }, [prScanJobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading scan results...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Error Loading Results
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {error}
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button onClick={loadScanResults} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => router.push('/pr')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PR List
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              Back to PR List
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                PR Security Scan Results
              </h1>
              <p className="text-lg text-gray-600">
                Detailed analysis of security vulnerabilities in your pull request
              </p>
            </div>
          </div>
        </motion.div>

        {/* Scan Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <PRScanResults 
            prScanJobId={prScanJobId}
            onRefresh={loadScanResults}
          />
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12"
        >
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Understanding Your Scan Results
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Vulnerabilities Added</h4>
                    <p className="text-sm text-gray-600">
                      New security issues introduced by this PR that need attention.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Vulnerabilities Fixed</h4>
                    <p className="text-sm text-gray-600">
                      Security issues that were resolved by changes in this PR.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Recommendations</h4>
                    <p className="text-sm text-gray-600">
                      Our AI provides approve/review/block recommendations based on security impact.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
