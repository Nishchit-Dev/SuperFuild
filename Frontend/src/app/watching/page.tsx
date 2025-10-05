'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Mail, Shield, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { RepositoryWatch } from '@/lib/api';
import { apiService } from '@/lib/api';
import RepositoryWatchCard from '@/components/watching/RepositoryWatchCard';
import AddRepositoryWatch from '@/components/watching/AddRepositoryWatch';
import NotificationStats from '@/components/watching/NotificationStats';
import MonitoringStatus from '@/components/watching/MonitoringStatus';
import TestEmailModal from '@/components/watching/TestEmailModal';

export default function RepositoryWatchingPage() {
  const [watches, setWatches] = useState<RepositoryWatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTestEmail, setShowTestEmail] = useState(false);

  const loadWatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getWatchedRepositories();
      setWatches(response.watches);
    } catch (error) {
      console.error('Failed to load watches:', error);
      setError('Failed to load repository watches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatches();
  }, []);

  const getActiveWatches = () => {
    return watches.filter(watch => watch.is_active);
  };

  const getInactiveWatches = () => {
    return watches.filter(watch => !watch.is_active);
  };

  const getStats = () => {
    const active = getActiveWatches().length;
    const total = watches.length;
    const withEmail = watches.filter(watch => watch.email_notifications).length;
    const withScan = watches.filter(watch => watch.scan_on_open).length;
    
    return { active, total, withEmail, withScan };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
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
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Repository Watching</h1>
              <p className="text-gray-600 mt-2">
                Monitor repositories for new pull requests and receive security scan notifications
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTestEmail(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Test Email
              </button>
              <AddRepositoryWatch onWatchAdded={loadWatches} />
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Watches</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Email Enabled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.withEmail}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Auto-Scan</p>
                <p className="text-2xl font-bold text-gray-900">{stats.withScan}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Watches</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Monitoring Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <MonitoringStatus />
        </motion.div>

        {/* Notification Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <NotificationStats />
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Active Watches */}
        {getActiveWatches().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="flex items-center mb-4">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Active Watches</h2>
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                {getActiveWatches().length}
              </span>
            </div>
            <div className="space-y-4">
              {getActiveWatches().map((watch) => (
                <RepositoryWatchCard
                  key={watch.id}
                  watch={watch}
                  onUpdate={loadWatches}
                  onRemove={loadWatches}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Inactive Watches */}
        {getInactiveWatches().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center mb-4">
              <AlertCircle className="w-5 h-5 text-gray-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Inactive Watches</h2>
              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                {getInactiveWatches().length}
              </span>
            </div>
            <div className="space-y-4">
              {getInactiveWatches().map((watch) => (
                <RepositoryWatchCard
                  key={watch.id}
                  watch={watch}
                  onUpdate={loadWatches}
                  onRemove={loadWatches}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {watches.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Repository Watches</h3>
            <p className="text-gray-500 mb-6">
              Start watching repositories to receive automatic security scan notifications
            </p>
            <AddRepositoryWatch onWatchAdded={loadWatches} />
          </motion.div>
        )}

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How Repository Watching Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">1. Watch Repository</h4>
              <p className="text-sm text-gray-600">
                Select a repository to monitor for new pull requests
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">2. Auto-Scan</h4>
              <p className="text-sm text-gray-600">
                New PRs are automatically scanned for security vulnerabilities
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">3. Get Notified</h4>
              <p className="text-sm text-gray-600">
                Receive detailed email notifications with scan results
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Test Email Modal */}
      <TestEmailModal 
        isOpen={showTestEmail} 
        onClose={() => setShowTestEmail(false)} 
      />
    </div>
  );
}
