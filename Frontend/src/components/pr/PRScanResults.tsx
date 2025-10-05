'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PRScanJob, PRScanResult, PRSecuritySummary, Vulnerability } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText, 
  GitBranch,
  Clock,
  Loader2,
  RefreshCw,
  Code,
  ExternalLink,
  Plus,
  Minus,
  AlertCircle
} from 'lucide-react';

interface PRScanResultsProps {
  prScanJobId: number;
  onRefresh?: () => void;
}

export function PRScanResults({ prScanJobId, onRefresh }: PRScanResultsProps) {
  const [scanJob, setScanJob] = useState<PRScanJob | null>(null);
  const [results, setResults] = useState<PRScanResult[]>([]);
  const [securitySummary, setSecuritySummary] = useState<PRSecuritySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());

  // Load scan results
  const loadScanResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { apiService } = await import('@/lib/api');
      const response = await apiService.getPRScanResults(prScanJobId);
      
      console.log('PR Scan Results Response:', response);
      console.log('Scan Job Data:', response.prScanJob);
      
      setScanJob(response.prScanJob);
      setResults(response.results);
      setSecuritySummary(response.securitySummary);
    } catch (err) {
      console.error('Failed to load scan results:', err);
      setError('Failed to load scan results');
    } finally {
      setLoading(false);
    }
  };

  // Load file content
  const loadFileContent = async (filePath: string) => {
    if (fileContents.has(filePath) || loadingFiles.has(filePath)) return;
    
    try {
      setLoadingFiles(prev => new Set(prev).add(filePath));
      
      const { apiService } = await import('@/lib/api');
      const content = await apiService.getPRScanFileContent(prScanJobId, filePath);
      
      setFileContents(prev => new Map(prev).set(filePath, content.content));
    } catch (error) {
      console.error('Failed to load file content:', error);
    } finally {
      setLoadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(filePath);
        return newSet;
      });
    }
  };


  // Get default range for highlighting
  const getDefaultRange = (vuln: Vulnerability) => {
    if (vuln.startingLine && vuln.endingLine) {
      return { start: vuln.startingLine, end: vuln.endingLine };
    }
    if (vuln.line) {
      const lineNum = parseInt(vuln.line);
      if (!isNaN(lineNum)) {
        return { start: lineNum, end: lineNum };
      }
    }
    return null;
  };

  // Get vulnerability ranges for context display
  const getVulnerabilityRanges = (vulnerabilities: Vulnerability[]) => {
    const ranges = new Set<number>();
    
    vulnerabilities.forEach(vuln => {
      const range = getDefaultRange(vuln);
      if (range) {
        // Add -8 to +8 context around each vulnerability
        for (let i = Math.max(1, range.start - 8); i <= range.end + 8; i++) {
          ranges.add(i);
        }
      }
    });
    
    return ranges;
  };

  // Render code with highlighting and context
  const renderCodeWithHighlight = (content: string, filePath: string, vulnerabilities: Vulnerability[]) => {
    const lines = content.split('\n');
    const vulnerabilityRanges = getVulnerabilityRanges(vulnerabilities);
    const allLines = lines.map((_, i) => i + 1);
    
    // Filter to show only lines with vulnerabilities + context
    const linesToShow = vulnerabilityRanges.size > 0 
      ? allLines.filter(lineNum => vulnerabilityRanges.has(lineNum))
      : allLines;
    
    const startLine = linesToShow.length > 0 ? Math.min(...linesToShow) : 1;
    const endLine = linesToShow.length > 0 ? Math.max(...linesToShow) : lines.length;
    
    return (
      <div className="bg-gray-200 text-gray-900 rounded-lg overflow-hidden">
        <div className="flex">
          <div className="bg-gray-800 text-gray-400 text-sm px-3 py-2 font-mono select-none">
            {linesToShow.map(lineNum => (
              <div key={lineNum} className="leading-6">{lineNum}</div>
            ))}
          </div>
          <div className="flex-1 overflow-x-auto">
            <pre className="text-sm leading-6 p-3">
              {linesToShow.map(lineNum => {
                const lineIndex = lineNum - 1;
                const line = lines[lineIndex] || '';
                const isHighlighted = vulnerabilities.some(vuln => {
                  const range = getDefaultRange(vuln);
                  return range && lineNum >= range.start && lineNum <= range.end;
                });
                
                return (
                  <div
                    key={lineNum}
                    className={`${isHighlighted ? 'bg-red-500/20 border-l-4 border-red-500 pl-2' : ''}`}
                  >
                    {line}
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  // Auto-load file content when results change
  useEffect(() => {
    if (results.length > 0) {
      results.forEach(result => {
        if (!fileContents.has(result.file_path) && !loadingFiles.has(result.file_path)) {
          loadFileContent(result.file_path);
        }
      });
    }
  }, [results]);

  // Auto-refresh for running scans
  useEffect(() => {
    loadScanResults();
    
    if (scanJob?.status === 'running' || scanJob?.status === 'pending') {
      const interval = setInterval(loadScanResults, 2000);
      return () => clearInterval(interval);
    }
  }, [prScanJobId, scanJob?.status]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (started: string, completed?: string) => {
    const start = new Date(started);
    const end = completed ? new Date(completed) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}s`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ${diffSecs % 60}s`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'modified':
        return <Code className="h-4 w-4 text-blue-500" />;
      case 'deleted':
        return <Minus className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'modified':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'deleted':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading && !scanJob) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading scan results...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Results</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={loadScanResults} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!scanJob) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Scan Results</h3>
        <p className="text-gray-600">Scan results not found or not yet available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scan Job Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(scanJob.status)}
              <div>
                <CardTitle className="text-xl">
                  PR #{scanJob.pullRequest.githubPrId} - {scanJob.pullRequest.title}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {scanJob.repository.fullName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(scanJob.status)}>
                {scanJob.status.toUpperCase()}
              </Badge>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Commit:</span>
              <span className="font-medium">
                {scanJob.headCommit ? scanJob.headCommit.substring(0, 8) : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">
                {getDuration(scanJob.startedAt, scanJob.completedAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Files:</span>
              <span className="font-medium">{results.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Type:</span>
              <span className="font-medium">{scanJob.scanType}</span>
            </div>
          </div>
          
          {scanJob.errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">Scan Error</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{scanJob.errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Summary */}
      {securitySummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Security Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {securitySummary.total_vulnerabilities_added}
                </div>
                <div className="text-sm text-red-700">Vulnerabilities Added</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {securitySummary.total_vulnerabilities_fixed}
                </div>
                <div className="text-sm text-green-700">Vulnerabilities Fixed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {securitySummary.security_score_after}/100
                </div>
                <div className="text-sm text-blue-700">Security Score</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {securitySummary.critical_added}
                </div>
                <div className="text-sm text-yellow-700">Critical Issues</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Recommendation:</span>
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
      )}

      {/* Detailed Vulnerability Results */}
      {results.length > 0 ? (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Security Analysis</h3>
          <AnimatePresence>
            {results.map((result) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* File Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {getChangeTypeIcon(result.change_type)}
                        {result.file_path}
                      </CardTitle>
                      <Badge className={getChangeTypeColor(result.change_type)}>
                        {result.change_type.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="font-bold text-red-600">
                          {result.vulnerabilities_added.length}
                        </div>
                        <div className="text-red-700">Added</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-bold text-green-600">
                          {result.vulnerabilities_fixed.length}
                        </div>
                        <div className="text-green-700">Fixed</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-bold text-gray-600">
                          {result.vulnerabilities_unchanged.length}
                        </div>
                        <div className="text-gray-700">Unchanged</div>
                      </div>
                    </div>
                    
                    {/* Code Display - Always Show */}
                    <div className="mt-4">
                      {loadingFiles.has(result.file_path) ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          <span>Loading file content...</span>
                        </div>
                      ) : fileContents.has(result.file_path) ? (
                        renderCodeWithHighlight(
                          fileContents.get(result.file_path)!,
                          result.file_path,
                          [
                            ...result.vulnerabilities_added,
                            ...result.vulnerabilities_fixed,
                            ...result.vulnerabilities_unchanged
                          ]
                        )
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          Failed to load file content
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Vulnerabilities Added */}
                {result.vulnerabilities_added.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-red-600">
                        <Plus className="h-4 w-4" />
                        New Vulnerabilities ({result.vulnerabilities_added.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {result.vulnerabilities_added.map((vuln: Vulnerability, index: number) => (
                        <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(vuln.severity)}
                              <h4 className="font-medium text-gray-900">{vuln.title}</h4>
                            </div>
                            <Badge className={getSeverityColor(vuln.severity)}>
                              {vuln.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{vuln.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {vuln.cweId && (
                              <Badge variant="outline" className="text-gray-600">
                                {vuln.cweId}
                              </Badge>
                            )}
                            {vuln.owaspCategory && (
                              <Badge variant="outline" className="text-gray-600">
                                {vuln.owaspCategory}
                              </Badge>
                            )}
                            {vuln.line && (
                              <Badge variant="outline" className="text-gray-600">
                                Line {vuln.line}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Vulnerabilities Fixed */}
                {result.vulnerabilities_fixed.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Fixed Vulnerabilities ({result.vulnerabilities_fixed.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {result.vulnerabilities_fixed.map((vuln: Vulnerability, index: number) => (
                        <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <h4 className="font-medium text-gray-900">{vuln.title}</h4>
                            </div>
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              FIXED
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{vuln.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {vuln.cweId && (
                              <Badge variant="outline" className="text-gray-600">
                                {vuln.cweId}
                              </Badge>
                            )}
                            {vuln.owaspCategory && (
                              <Badge variant="outline" className="text-gray-600">
                                {vuln.owaspCategory}
                              </Badge>
                            )}
                            {vuln.line && (
                              <Badge variant="outline" className="text-gray-600">
                                Line {vuln.line}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Vulnerabilities Unchanged */}
                {result.vulnerabilities_unchanged.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-gray-600">
                        <AlertCircle className="h-4 w-4" />
                        Existing Vulnerabilities ({result.vulnerabilities_unchanged.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {result.vulnerabilities_unchanged.map((vuln: Vulnerability, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(vuln.severity)}
                              <h4 className="font-medium text-gray-900">{vuln.title}</h4>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={getSeverityColor(vuln.severity)}>
                                {vuln.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-gray-600">
                                UNCHANGED
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{vuln.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {vuln.cweId && (
                              <Badge variant="outline" className="text-gray-600">
                                {vuln.cweId}
                              </Badge>
                            )}
                            {vuln.owaspCategory && (
                              <Badge variant="outline" className="text-gray-600">
                                {vuln.owaspCategory}
                              </Badge>
                            )}
                            {vuln.line && (
                              <Badge variant="outline" className="text-gray-600">
                                Line {vuln.line}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : scanJob.status === 'completed' ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Issues Found</h3>
            <p className="text-gray-600">
              This PR doesn't introduce any new security vulnerabilities.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
