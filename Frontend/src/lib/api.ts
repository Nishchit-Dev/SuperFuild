const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// PR Scanning Types
export interface PullRequest {
  id: number;
  github_pr_id: number;
  title: string;
  description?: string;
  author_username: string;
  author_avatar_url: string;
  base_branch: string;
  head_branch: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  merged_at?: string;
  scan_count?: number;
  last_scan_at?: string;
}

export interface PRScanJob {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  scanType: 'pr_diff' | 'pr_full' | 'pr_targeted';
  baseCommit: string;
  headCommit: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  pullRequest: {
    id: number;
    title: string;
    githubPrId: number;
  };
  repository: {
    name: string;
    fullName: string;
  };
}

export interface Vulnerability {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  line?: string;
  startingLine?: number;
  endingLine?: number;
  category: string;
  cweId?: string;
  owaspCategory?: string;
}

export interface PRScanResult {
  id: number;
  file_path: string;
  change_type: 'added' | 'modified' | 'deleted';
  vulnerabilities_added: Vulnerability[];
  vulnerabilities_fixed: Vulnerability[];
  vulnerabilities_unchanged: Vulnerability[];
  ai_analysis_metadata: any;
}

export interface PRSecuritySummary {
  id: number;
  total_vulnerabilities_added: number;
  total_vulnerabilities_fixed: number;
  total_vulnerabilities_unchanged: number;
  critical_added: number;
  critical_fixed: number;
  high_added: number;
  high_fixed: number;
  security_score_before: number;
  security_score_after: number;
  recommendation: 'approve' | 'review' | 'block';
}

// Repository Watching Types
export interface RepositoryWatch {
  id: number;
  user_id: number;
  repository_id: number;
  is_active: boolean;
  email_notifications: boolean;
  scan_on_open: boolean;
  scan_on_sync: boolean;
  scan_on_merge: boolean;
  notification_email: string;
  created_at: string;
  updated_at: string;
  name: string;
  full_name: string;
  description?: string;
  is_private: boolean;
}

export interface WatchSettings {
  emailNotifications?: boolean;
  scanOnOpen?: boolean;
  scanOnSync?: boolean;
  scanOnMerge?: boolean;
  notificationEmail?: string;
}

export interface NotificationStats {
  status: 'pending' | 'sent' | 'failed';
  count: number;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Network error', code: 'NETWORK_ERROR' };
        }

        const error = new Error(errorData.error || 'Request failed');
        (error as any).code = errorData.code || 'UNKNOWN_ERROR';
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    } catch (error: any) {
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error('Unable to connect to server. Please check your internet connection.');
        (networkError as any).code = 'NETWORK_ERROR';
        (networkError as any).status = 0;
        throw networkError;
      }
      throw error;
    }
  }

  // Authentication methods
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/profile');
  }

  async logout(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    });
  }

  // Code scanning method
  async scanCode(code: string, filename?: string): Promise<any> {
    return this.request('/scan', {
      method: 'POST',
      body: JSON.stringify({ code, filename }),
    });
  }

  // PR Scanning methods
  async getPullRequests(repoId: number, options: { page?: number; limit?: number; status?: string } = {}): Promise<{
    prs: PullRequest[];
    pagination: { page: number; limit: number; total: number };
  }> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);
    
    const queryString = params.toString();
    return this.request(`/api/pr/repositories/${repoId}/pull-requests${queryString ? `?${queryString}` : ''}`);
  }

  async getPullRequestDetails(prId: number): Promise<PullRequest> {
    return this.request(`/api/pr/pull-requests/${prId}`);
  }

  async startPRScan(prId: number, scanType: 'pr_diff' | 'pr_full' | 'pr_targeted' = 'pr_diff'): Promise<{
    message: string;
    prScanJobId: number;
    status: string;
  }> {
    return this.request(`/api/pr/pull-requests/${prId}/scan`, {
      method: 'POST',
      body: JSON.stringify({ scanType }),
    });
  }

  async getPRScanResults(prScanJobId: number): Promise<{
    prScanJob: PRScanJob;
    results: PRScanResult[];
    securitySummary: PRSecuritySummary | null;
  }> {
    return this.request(`/api/pr/pr-scans/${prScanJobId}`);
  }

  async getPRSecuritySummary(prId: number): Promise<PRSecuritySummary | null> {
    return this.request(`/api/pr/pull-requests/${prId}/security-summary`);
  }

  async syncPullRequests(repoId: number): Promise<{
    message: string;
    prsAdded: number;
    prsUpdated: number;
  }> {
    return this.request(`/api/pr/repositories/${repoId}/sync-prs`, {
      method: 'POST',
    });
  }

  async getPRScanFileContent(prScanJobId: number, filePath: string, branch?: string): Promise<{
    path: string;
    content: string;
    encoding: string;
    sha: string | null;
  }> {
    const params = new URLSearchParams({ path: filePath });
    if (branch) params.append('branch', branch);
    
    return this.request(`/api/pr/pr-scans/${prScanJobId}/file?${params.toString()}`);
  }

  // Repository Watching API methods
  async getWatchedRepositories(): Promise<{ watches: RepositoryWatch[] }> {
    return this.request('/api/watching/watches');
  }

  async addRepositoryWatch(repositoryId: number, settings: WatchSettings): Promise<{ message: string }> {
    return this.request('/api/watching/watches', {
      method: 'POST',
      body: JSON.stringify({ repositoryId, settings }),
    });
  }

  async removeRepositoryWatch(repositoryId: number): Promise<{ message: string }> {
    return this.request(`/api/watching/watches/${repositoryId}`, {
      method: 'DELETE',
    });
  }

  async updateWatchSettings(repositoryId: number, settings: Partial<WatchSettings>): Promise<{ message: string }> {
    return this.request(`/api/watching/watches/${repositoryId}`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getNotificationStats(): Promise<{ stats: NotificationStats[] }> {
    return this.request('/api/watching/notifications/stats');
  }

  async testEmail(email: string): Promise<{ message: string }> {
    return this.request('/api/watching/test-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getMonitoringStatus(): Promise<{ status: any }> {
    return this.request('/api/watching/monitoring/status');
  }

  async triggerPRCheck(): Promise<{ message: string }> {
    return this.request('/api/watching/monitoring/check', {
      method: 'POST',
    });
  }

  // Convenience helpers
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiService = new ApiService(API_BASE_URL);
