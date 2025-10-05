'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, MailCheck, MailX, RefreshCw } from 'lucide-react';
import { NotificationStats as NotificationStatsType } from '@/lib/api';
import { apiService } from '@/lib/api';

export default function NotificationStats() {
  const [stats, setStats] = useState<NotificationStatsType[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await apiService.getNotificationStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load notification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const getTotalNotifications = () => {
    return stats.reduce((total, stat) => total + stat.count, 0);
  };

  const getStatsByStatus = (status: string) => {
    return stats.find(stat => stat.status === status)?.count || 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <MailCheck className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <MailX className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Mail className="w-5 h-5 text-yellow-500" />;
      default:
        return <Mail className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-700 bg-green-100';
      case 'failed':
        return 'text-red-700 bg-red-100';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
        <button
          onClick={loadStats}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{getTotalNotifications()}</div>
          <div className="text-sm text-gray-500">Total Notifications</div>
        </div>

        {stats.map((stat) => (
          <motion.div
            key={stat.status}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-2">
              {getStatusIcon(stat.status)}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
            <div className={`text-sm px-2 py-1 rounded-full inline-block ${getStatusColor(stat.status)}`}>
              {getStatusText(stat.status)}
            </div>
          </motion.div>
        ))}
      </div>

      {stats.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <Mail className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No notification data available</p>
        </div>
      )}
    </motion.div>
  );
}
