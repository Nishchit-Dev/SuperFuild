'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '@/lib/api';

export default function MonitoringStatus() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const response = await apiService.getMonitoringStatus();
      setStatus(response.status);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Failed to load monitoring status:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerCheck = async () => {
    setLoading(true);
    try {
      await apiService.triggerPRCheck();
      await loadStatus(); // Refresh status after check
    } catch (error) {
      console.error('Failed to trigger PR check:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {status.isRunning ? (
            <Eye className="w-5 h-5 text-green-500" />
          ) : (
            <EyeOff className="w-5 h-5 text-gray-400" />
          )}
          <h3 className="text-lg font-semibold text-gray-900">PR Monitoring</h3>
        </div>
        <button
          onClick={triggerCheck}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Check Now
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            {status.isRunning ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-500" />
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {status.isRunning ? 'Active' : 'Inactive'}
          </div>
          <div className="text-sm text-gray-500">Status</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(status.pollingInterval / 1000)}s
          </div>
          <div className="text-sm text-gray-500">Check Interval</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Eye className="w-6 h-6 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {status.watchedRepositories}
          </div>
          <div className="text-sm text-gray-500">Watched Repos</div>
        </div>
      </div>

      {lastCheck && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Last check:</span>
            <span>{lastCheck.toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {!status.isRunning && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              PR monitoring is not running. Restart the backend server to enable monitoring.
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
