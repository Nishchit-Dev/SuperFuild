'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PullRequest, PRSecuritySummary } from '@/lib/api';
import { PRCard } from './PRCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  GitPullRequest,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface PRListProps {
  repositoryId: number;
  onPRSelect: (prId: number) => void;
  onPRScan: (prId: number) => void;
}

export function PRList({ repositoryId, onPRSelect, onPRScan }: PRListProps) {
  const [prs, setPRs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [scanningPRs, setScanningPRs] = useState<Set<number>>(new Set());
  const [securitySummaries, setSecuritySummaries] = useState<Map<number, PRSecuritySummary>>(new Map());

  // Load PRs
  const loadPRs = async () => {
    try {
      setLoading(true);
      const { apiService } = await import('@/lib/api');
      const response = await apiService.getPullRequests(repositoryId, {
        page: 1,
        limit: 50,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      setPRs(response.prs);
    } catch (error) {
      console.error('Failed to load PRs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load security summaries for all PRs
  const loadSecuritySummaries = async () => {
    const summaries = new Map<number, PRSecuritySummary>();
    
    for (const pr of prs) {
      try {
        const { apiService } = await import('@/lib/api');
        const summary = await apiService.getPRSecuritySummary(pr.id);
        if (summary) {
          summaries.set(pr.id, summary);
        }
      } catch (error) {
        console.error(`Failed to load security summary for PR ${pr.id}:`, error);
      }
    }
    
    setSecuritySummaries(summaries);
  };

  // Handle PR scan
  const handlePRScan = async (prId: number) => {
    try {
      setScanningPRs(prev => new Set(prev).add(prId));
      const { apiService } = await import('@/lib/api');
      await apiService.startPRScan(prId);
      
      // Call the parent handler
      onPRScan(prId);
      
      // Reload security summaries after scan
      setTimeout(() => {
        loadSecuritySummaries();
      }, 2000);
    } catch (error) {
      console.error('Failed to start PR scan:', error);
    } finally {
      setScanningPRs(prev => {
        const newSet = new Set(prev);
        newSet.delete(prId);
        return newSet;
      });
    }
  };

  // Filter PRs based on search and status
  const filteredPRs = prs.filter(pr => {
    const matchesSearch = pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pr.author_username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Load data on mount and when filters change
  useEffect(() => {
    loadPRs();
  }, [repositoryId, statusFilter]);

  useEffect(() => {
    if (prs.length > 0) {
      loadSecuritySummaries();
    }
  }, [prs]);

  const getStatusCounts = () => {
    const open = prs.filter(pr => pr.status === 'open').length;
    const closed = prs.filter(pr => pr.status === 'closed').length;
    return { open, closed, total: prs.length };
  };

  const counts = getStatusCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-gray-600">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading pull requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitPullRequest className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900">Pull Requests</h2>
          <Badge variant="outline" className="text-sm">
            {counts.total} total
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadPRs}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search PRs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <div className="flex gap-1">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All ({counts.total})
            </Button>
            <Button
              variant={statusFilter === 'open' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('open')}
              className="flex items-center gap-1"
            >
              <CheckCircle className="h-3 w-3" />
              Open ({counts.open})
            </Button>
            <Button
              variant={statusFilter === 'closed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('closed')}
              className="flex items-center gap-1"
            >
              <XCircle className="h-3 w-3" />
              Closed ({counts.closed})
            </Button>
          </div>
        </div>
      </div>

      {/* PR List */}
      {filteredPRs.length === 0 ? (
        <div className="text-center py-12">
          <GitPullRequest className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No PRs found' : 'No pull requests'}
          </h3>
          <p className="text-gray-600">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Pull requests will appear here once they are synced from GitHub'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredPRs.map((pr) => (
              <motion.div
                key={pr.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <PRCard
                  pr={pr}
                  securitySummary={securitySummaries.get(pr.id)}
                  onScan={handlePRScan}
                  onViewDetails={onPRSelect}
                  isScanning={scanningPRs.has(pr.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
