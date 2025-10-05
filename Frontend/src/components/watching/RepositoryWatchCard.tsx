'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  MailX, 
  Scan, 
  X, 
  Settings, 
  Trash2, 
  CheckCircle, 
  XCircle,
  AlertCircle
} from 'lucide-react';
import { RepositoryWatch, WatchSettings } from '@/lib/api';
import { apiService } from '@/lib/api';

interface RepositoryWatchCardProps {
  watch: RepositoryWatch;
  onUpdate: () => void;
  onRemove: () => void;
}

export default function RepositoryWatchCard({ watch, onUpdate, onRemove }: RepositoryWatchCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<WatchSettings>({
    emailNotifications: watch.email_notifications,
    scanOnOpen: watch.scan_on_open,
    scanOnSync: watch.scan_on_sync,
    scanOnMerge: watch.scan_on_merge,
    notificationEmail: watch.notification_email,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiService.updateWatchSettings(watch.repository_id, settings);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update watch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to stop watching this repository?')) return;
    
    setLoading(true);
    try {
      await apiService.removeRepositoryWatch(watch.repository_id);
      onRemove();
    } catch (error) {
      console.error('Failed to remove watch:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!watch.is_active) return <XCircle className="w-4 h-4 text-red-500" />;
    if (watch.email_notifications && watch.scan_on_open) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (!watch.is_active) return 'Inactive';
    if (watch.email_notifications && watch.scan_on_open) return 'Fully Active';
    return 'Partially Active';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon()}
            <h3 className="text-lg font-semibold text-gray-900">{watch.name}</h3>
            <span className="text-sm text-gray-500">({watch.full_name})</span>
          </div>
          {watch.description && (
            <p className="text-sm text-gray-600 mb-2">{watch.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              watch.is_private 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {watch.is_private ? 'Private' : 'Public'}
            </span>
            <span className="text-gray-500">
              Status: {getStatusText()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleRemove}
            className="p-2 text-red-400 hover:text-red-600 transition-colors"
            disabled={loading}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email Notifications</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.scanOnOpen}
                  onChange={(e) => setSettings(prev => ({ ...prev, scanOnOpen: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Scan className="w-4 h-4" />
                <span className="text-sm font-medium">Scan on PR Open</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.scanOnSync}
                  onChange={(e) => setSettings(prev => ({ ...prev, scanOnSync: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Scan className="w-4 h-4" />
                <span className="text-sm font-medium">Scan on PR Sync</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.scanOnMerge}
                  onChange={(e) => setSettings(prev => ({ ...prev, scanOnMerge: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Scan className="w-4 h-4" />
                <span className="text-sm font-medium">Scan on PR Merge</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Email
              </label>
              <input
                type="email"
                value={settings.notificationEmail || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, notificationEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            {watch.email_notifications ? (
              <Mail className="w-4 h-4 text-green-500" />
            ) : (
              <MailX className="w-4 h-4 text-gray-400" />
            )}
            <span className={watch.email_notifications ? 'text-green-700' : 'text-gray-500'}>
              Email Notifications
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {watch.scan_on_open ? (
              <Scan className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            <span className={watch.scan_on_open ? 'text-green-700' : 'text-gray-500'}>
              Scan on Open
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {watch.scan_on_sync ? (
              <Scan className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            <span className={watch.scan_on_sync ? 'text-green-700' : 'text-gray-500'}>
              Scan on Sync
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {watch.scan_on_merge ? (
              <Scan className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            <span className={watch.scan_on_merge ? 'text-green-700' : 'text-gray-500'}>
              Scan on Merge
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
