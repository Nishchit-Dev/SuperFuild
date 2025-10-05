'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Eye, Mail, Scan, CheckCircle, XCircle } from 'lucide-react';
import { Repository, WatchSettings } from '@/lib/api';
import { apiService } from '@/lib/api';

interface AddRepositoryWatchProps {
  onWatchAdded: () => void;
}

export default function AddRepositoryWatch({ onWatchAdded }: AddRepositoryWatchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [watchedRepos, setWatchedRepos] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [settings, setSettings] = useState<WatchSettings>({
    emailNotifications: true,
    scanOnOpen: true,
    scanOnSync: true,
    scanOnMerge: false,
    notificationEmail: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadRepositories();
      loadWatchedRepositories();
    }
  }, [isOpen]);

  const loadRepositories = async () => {
    try {
      const response = await apiService.get('/api/github/repositories');
      setRepositories(response.repositories || []);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    }
  };

  const loadWatchedRepositories = async () => {
    try {
      const response = await apiService.getWatchedRepositories();
      const watchedIds = response.watches.map(watch => watch.repository_id);
      setWatchedRepos(watchedIds);
    } catch (error) {
      console.error('Failed to load watched repositories:', error);
    }
  };

  const filteredRepositories = repositories.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         repo.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const notWatched = !watchedRepos.includes(repo.id);
    return matchesSearch && notWatched;
  });

  const handleAddWatch = async () => {
    if (!selectedRepo) return;

    setLoading(true);
    try {
      await apiService.addRepositoryWatch(selectedRepo.id, settings);
      setIsOpen(false);
      setSelectedRepo(null);
      setSettings({
        emailNotifications: true,
        scanOnOpen: true,
        scanOnSync: true,
        scanOnMerge: false,
        notificationEmail: '',
      });
      onWatchAdded();
    } catch (error) {
      console.error('Failed to add repository watch:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Watch Repository
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Watch Repository</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Repository Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Repository
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search repositories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    {filteredRepositories.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        {searchQuery ? 'No repositories found' : 'No available repositories'}
                      </div>
                    ) : (
                      filteredRepositories.map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => setSelectedRepo(repo)}
                          className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                            selectedRepo?.id === repo.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{repo.name}</div>
                              <div className="text-sm text-gray-500">{repo.fullName}</div>
                            </div>
                            {selectedRepo?.id === repo.id && (
                              <CheckCircle className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Watch Settings */}
                {selectedRepo && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Watch Settings</h3>
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
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddWatch}
                    disabled={!selectedRepo || loading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Adding...' : 'Add Watch'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
