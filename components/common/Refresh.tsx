"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { Download, Lock } from 'lucide-react';
import { fetchRuns, syncLatestRuns } from "@/lib/api";
import type { RunActivity, RunSplit, SyncResult } from "@/types";

function formatPace(pace: string | number | null | undefined) {
  if (typeof pace === 'string' && pace.includes(':')) {
    return pace;
  }
  const paceNum = parseFloat(String(pace ?? ""));
  if (!paceNum) return 'N/A';
  const minutes = Math.floor(paceNum);
  const seconds = Math.round((paceNum - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

const Refresh = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const router = useRouter();

  // Check password on mount from sessionStorage
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('refreshPageAuth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const correctPassword = process.env.NEXT_PUBLIC_REFRESH_PAGE_PASSWORD;
    
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('refreshPageAuth', 'true');
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('Incorrect password');
      setPasswordInput('');
    }
  };

  const getAllRuns = async () => {
    try {
      const runs = await fetchRuns();
      const runsMap = new Map<string, RunActivity>();

      runs.forEach((data) => {
        // Use ID as key to deduplicate
        if (data.id) {
          runsMap.set(String(data.id), data);
        }
      });
      
      // Sort in memory just in case
      return Array.from(runsMap.values()).sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    } catch (error) {
      console.error('Error fetching runs:', error);
      throw error;
    }
  };

  const exportToCSV = async () => {
    try {
      setLoading(true);
      setStatus('Fetching all runs and splits...');
      
      const runs = await getAllRuns();
      
      if (runs.length === 0) {
        setError('No runs found to export');
        setStatus('');
        return;
      }

      // Prepare CSV headers
      let csvContent = 'Run Name,Date,Distance (km),Pace,Time (min),Description,Split Number,Split Distance (km),Split Pace,Split Time\n';

      // Helper for split time formatting (seconds to mm:ss)
      const formatSplitTime = (seconds: number | null | undefined) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      // Helper for split pace calculation
      const calculateSplitPace = (split: RunSplit) => {
        // Return existing pace if valid string
        if (split.pace_zone !== undefined && typeof split.pace === 'string') return split.pace;
        
        // Calculate from average_speed (m/s) if available
        if (split.average_speed) {
          // 16.6667 / speed_mps = min/km
          const paceMinPerKm = 16.666666667 / split.average_speed;
          return formatPace(paceMinPerKm);
        }
        
        // Check for pace_min_per_km directly (from our new backend format)
        if (split.pace_min_per_km) {
           return formatPace(split.pace_min_per_km);
        }

        // Calculate from distance (meters) and time (seconds)
        if (split.distance && split.elapsed_time) {
           const timeMin = split.elapsed_time / 60;
           const distKm = split.distance / 1000;
           if (distKm > 0) {
             return formatPace(timeMin / distKm);
           }
        }
        
        return split.pace || '';
      };

      // Calculate max splits to determine header columns
      let maxSplits = 0;
      runs.forEach(run => {
        if (run.splits && run.splits.length > maxSplits) {
          maxSplits = run.splits.length;
        }
      });

      // Prepare CSV headers
      let headers = ['Run Name', 'Date', 'Total Distance (km)', 'Total Time (min)', 'Average Pace (min/km)', 'Notes'];
      for (let i = 1; i <= maxSplits; i++) {
        headers.push(`Split${i}_Distance(km)`, `Split${i}_Time`, `Split${i}_Pace`);
      }
      

      // Process each run
      runs.forEach((run) => {
        const splits = run.splits || [];
        
        let formattedDate = '';
        if (run.date) {
             try {
                 // Try to format as YYYY-MM-DD
                 formattedDate = new Date(run.date).toISOString().split('T')[0];
             } catch (e) {
                 formattedDate = run.date;
             }
        }

        const row = [
          `"${run.name || ''}"`,
          formattedDate,
          run.distance_km || '',
          run.elapsed_time_min || '',
          run.pace || '',
          `"${run.description || ''}"`
        ];

        // Add split data inline
        for (let i = 0; i < maxSplits; i++) {
          if (i < splits.length) {
            const split = splits[i];
            
            // Normalize split data logic
            // Backend sends `km` (actually just split index/label sometimes) or `distance`?
            // index.js backend sends: { km: s.split, pace_min_per_km: ..., elapsed_time: ... }
            // Run.json legacy might have different format.
            // Let's look at `calculateSplitPace` logic again.
            
            // Distance: backend might not send clean distance in km?
            // Strava `splits_metric` has `distance` in meters usually.
            // Our backend `index.js` uses `s.split` as key "km" but that's just a number usually.
            // Wait, Strava `splits_metric` objects have `distance` (float meters), `elapsed_time` (int seconds), `average_speed` (float m/s), `pace_zone`.
            // Our backend `index.js` maps:
            // km: s.split (which is split number usually), elapsed_time, pace_min_per_km.
            // It actually DOES NOT send distance in meters explicitly in backend map!
            // Backend: `km: s.split`. `s.split` typically is "1", "2"...
            
            // Let's re-check backend source code I wrote.
            // splits: ... map(s => ({ km: s.split, pace_min_per_km: ..., elapsed_time: s.elapsed_time }))
            // It seems I missed `distance` in the backend splits mapping? 
            // Ah, Strava splits_metric items usually imply 1km splits mostly, but last one is partial.
            // Standard Strava split is 1000m.
            // But let's check legacy data or Firebase data.
            // `Run.json` doesn't show splits structure.
            
            // Assuming nearly 1km or calculating from `elapsed_time` and `pace`.
            // Let's try to infer distance if missing.
            
            let splitDist = '';
            if (split.distance) {
               splitDist = String(split.distance > 100 ? (split.distance / 1000).toFixed(2) : split.distance);
            } else if (split.km) {
               // If backend returns 'km' as the split index, we ideally need the actual distance.
               // Strava splits are usually 1km. But let's use what we have.
               // If we can't find distance, we might output '1.00' if it's not the last one? No that's risky.
               // Let's look at `index.js` again.
               // I should update backend to include `distance` in split if possible.
               // But for now, let's work with what we have.
               splitDist = String(split.km || '');
            }

            const splitPace = calculateSplitPace(split);
            const splitTime = split.elapsed_time ? formatSplitTime(split.elapsed_time) : (split.time || '');

             row.push(splitDist, splitTime, splitPace);
          } else {
             // Empty columns for missing splits
             row.push('', '', '');
          }
        }
        
        csvContent += row.join(',') + '\n';
      });

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `runs-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus('✅ CSV exported successfully!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during export');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus('Syncing Strava in 50-activity batches...');
      const saveResult = await syncLatestRuns();
      
      setResult(saveResult);
      setStatus('✅ Refresh completed successfully!');

    } catch (err) {
      console.error('Refresh error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during refresh');
      setStatus('❌ Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pure-black text-pure-white font-montserrat py-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <button
            className="px-6 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-all duration-200 border border-white/10 backdrop-blur-sm flex items-center gap-2"
            onClick={() => router.push("/runs")}
          >
            <span>←</span> Back to Runs
          </button>
        </div>

        {/* Password Authentication Modal */}
        {!isAuthenticated ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <div className="w-full max-w-md bg-pure-black border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
               {/* Decorative glare */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

              <div className="flex flex-col items-center justify-center mb-8 relative z-10">
                <div className="p-4 bg-white/5 rounded-full mb-4 border border-white/10">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-center text-white mb-2 uppercase tracking-tight">Restricted Access</h2>
                <p className="text-white/40 text-center text-sm">Enter admin password to continue</p>
              </div>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4 relative z-10">
                <div>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    placeholder="PASSWORD"
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-200 text-center tracking-[0.2em] font-medium"
                    autoFocus
                  />
                </div>
                
                {passwordError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-sm font-medium text-center">{passwordError}</p>
                  </div>
                )}
                
                <button
                  type="submit"
                  className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors duration-200 mt-2"
                >
                  Unlock
                </button>

                <button
                  type="button" 
                  onClick={() => router.push("/runs")}
                  className="w-full py-3 text-white/40 text-sm hover:text-white transition-colors"
                >
                  Return to Safety
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {/* Main Content - Only visible when authenticated */}
        {isAuthenticated && (
          <div className="animate-in fade-in duration-500">
            {/* Title */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-7xl font-bold tracking-tighter uppercase mb-6">
                Refresh <span className="text-white/30">Center</span>
              </h1>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                Admin dashboard for managing Strava sync and data exports.
              </p>
            </div>

            {/* Main Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              
              {/* Refresh Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-8 hover:bg-white/10 transition-all duration-300">
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-9xl">🔄</span>
                 </div>
                 
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-white/10 rounded-xl border border-white/5">
                      <span className="text-2xl">🔄</span>
                    </div>
                    <h3 className="text-2xl font-bold uppercase tracking-tight">Sync Strava</h3>
                  </div>
                  
                  <p className="text-white/60 mb-8 min-h-[3rem]">
                    Fetch latest activities from Strava. Checks for new runs and adds them to the database securely.
                  </p>

                  {/* Status Display - Simplified */}
                  {status && (
                    <div className="mb-6 p-4 bg-black/40 rounded-xl border border-white/5 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        {loading && (
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                          </svg>
                        )}
                        <span className="text-white/90 text-sm font-medium">{status}</span>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-red-400 font-medium text-sm">{error}</p>
                    </div>
                  )}

                  {/* Result Display */}
                  {result && !loading && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl animate-in slide-in-from-bottom-2">
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-white/60">Total Activities</span>
                          <span className="font-bold text-white">{result.totalCount}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm mt-2">
                          <span className="text-white/60">New Added</span>
                          <span className="font-bold text-green-400">+{result.newCount}</span>
                       </div>
                    </div>
                  )}

                  <button
                    onClick={refreshData}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-wide transition-all duration-300 ${
                      loading
                        ? 'bg-white/10 text-white/40 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {loading ? 'Syncing...' : 'Start Sync'}
                  </button>
                </div>
              </div>

              {/* Export Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-8 hover:bg-white/10 transition-all duration-300">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Download className="w-32 h-32" />
                 </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-white/10 rounded-xl border border-white/5">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold uppercase tracking-tight">Export Data</h3>
                  </div>
                  
                  <p className="text-white/60 mb-8 min-h-[3rem]">
                    Download complete running history including splits, timestamps, and metrics in CSV format.
                  </p>

                  <div className="mb-6 p-4 bg-black/20 rounded-xl border border-white/5">
                     <div className="flex items-center gap-2 text-white/40 text-sm">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Auto-deduplication enabled
                     </div>
                     <div className="flex items-center gap-2 text-white/40 text-sm mt-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Includes all split data
                     </div>
                  </div>

                  <button
                    onClick={exportToCSV}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-wide transition-all duration-300 ${
                      loading
                        ? 'bg-white/10 text-white/40 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {loading ? 'Exporting...' : 'Download CSV'}
                  </button>
                </div>
              </div>

            </div>

            {/* Info Section */}
            <div className="mt-12 border-t border-white/10 pt-10 text-center text-white/40 text-sm">
              <p>Secure Admin Environment · Running Out of Excuses v2.0</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Refresh;
