'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PullRequest, PRSecuritySummary } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GitPullRequest, 
  User, 
  GitBranch, 
  Clock, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2
} from 'lucide-react';

interface PRCardProps {
  pr: PullRequest;
  securitySummary?: PRSecuritySummary | null;
  onScan: (prId: number) => void;
  onViewDetails: (prId: number) => void;
  isScanning?: boolean;
}

export function PRCard({ 
  pr, 
  securitySummary, 
  onScan, 
  onViewDetails, 
  isScanning = false 
}: PRCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusIcon = () => {
    switch (pr.status) {
      case 'open':
        return <GitPullRequest className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <GitPullRequest className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (pr.status) {
      case 'open':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRecommendationBadge = () => {
    if (!securitySummary) return null;

    const { recommendation } = securitySummary;
    const colors = {
      approve: 'bg-green-100 text-green-800 border-green-200',
      review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      block: 'bg-red-100 text-red-800 border-red-200'
    };

    const icons = {
      approve: <CheckCircle className="h-3 w-3" />,
      review: <AlertTriangle className="h-3 w-3" />,
      block: <XCircle className="h-3 w-3" />
    };

    return (
      <Badge className={`${colors[recommendation]} border flex items-center gap-1`}>
        {icons[recommendation]}
        {recommendation.toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={`cursor-pointer transition-all duration-200 ${
          isHovered ? 'shadow-lg border-blue-200' : 'shadow-sm'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                {pr.title}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor()}>
                #{pr.github_pr_id}
              </Badge>
              {getRecommendationBadge()}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Author and Branch Info */}
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
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

          {/* Security Summary */}
          {securitySummary && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Security Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Added:</span>
                  <span className="font-medium text-red-600">
                    {securitySummary.total_vulnerabilities_added}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fixed:</span>
                  <span className="font-medium text-green-600">
                    {securitySummary.total_vulnerabilities_fixed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Score:</span>
                  <span className="font-medium">
                    {securitySummary.security_score_after}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Critical:</span>
                  <span className="font-medium text-red-600">
                    {securitySummary.critical_added}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Scan History */}
          {pr.scan_count && pr.scan_count > 0 && (
            <div className="mb-4 text-sm text-gray-600">
              <span className="font-medium">Scans:</span> {pr.scan_count}
              {pr.last_scan_at && (
                <span className="ml-2">
                  (Last: {formatDate(pr.last_scan_at)})
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(pr.id)}
              className="flex-1"
            >
              View Details
            </Button>
            <Button
              size="sm"
              onClick={() => onScan(pr.id)}
              disabled={isScanning}
              className="flex-1"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Scan PR
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
