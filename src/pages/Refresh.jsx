import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, setDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.config.js';
import { Download, Lock } from 'lucide-react';

function formatPace(pace) {
  if (typeof pace === 'string' && pace.includes(':')) {
    return pace;
  }
  const paceNum = parseFloat(pace);
  if (!paceNum) return 'N/A';
  const minutes = Math.floor(paceNum);
  const seconds = Math.round((paceNum - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

const getExistingActivityIds = async () => {
  try {
    const q = query(collection(db, 'strava_activities'), orderBy('id', 'asc'));
    const querySnapshot = await getDocs(q);
    const existingIds = new Set();
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.id) {
        existingIds.add(data.id.toString());
      }
    });
    return existingIds;
  } catch (error) {
    console.error('Error getting existing activity IDs:', error);
    return new Set();
  }
};

const saveNewActivitiesToFirebase = async (activities, existingIds) => {
  try {
    // Filter out activities without valid IDs and check for duplicates
    const newActivities = activities.filter(activity => {
      // Check if activity has an ID
      if (!activity || !activity.id) {
        console.warn('Activity missing ID:', activity);
        return false;
      }
      // Check if it's not already in Firebase
      return !existingIds.has(activity.id.toString());
    });
    
    console.log(`Found ${newActivities.length} new activities out of ${activities.length} total`);
    
    if (newActivities.length === 0) {
      return { newCount: 0, totalCount: activities.length };
    }

    const promises = newActivities.map(async (activity) => {
      const activityId = `strava_${activity.id}`;
      await setDoc(doc(db, 'strava_activities', activityId), {
        ...activity,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    await Promise.all(promises);
    console.log(`✅ ${newActivities.length} new activities saved to Firebase`);
    
    return { newCount: newActivities.length, totalCount: activities.length };
  } catch (error) {
    console.error('Error saving new activities to Firebase:', error);
    throw error;
  }
};

const Refresh = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  // Check password on mount from sessionStorage
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('refreshPageAuth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_REFRESH_PAGE_PASSWORD;
    
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
      const q = query(collection(db, 'strava_activities'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const runsMap = new Map();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Use ID as key to deduplicate
        if (data.id) {
          runsMap.set(String(data.id), data);
        }
      });
      
      // Sort in memory just in case
      return Array.from(runsMap.values()).sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
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
      const formatSplitTime = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      // Helper for split pace calculation
      const calculateSplitPace = (split) => {
        // Return existing pace if valid string
        if (split.pace_zone !== undefined && typeof split.pace === 'string') return split.pace;
        
        // Calculate from average_speed (m/s) if available
        if (split.average_speed) {
          // 16.6667 / speed_mps = min/km
          const paceMinPerKm = 16.666666667 / split.average_speed;
          return formatPace(paceMinPerKm);
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

      // Process each run
      runs.forEach((run) => {
        const splits = run.splits && run.splits.length > 0 ? run.splits : [{}];
        
        splits.forEach((split, index) => {
          // Normalize split data
          // Assume distance > 100 is meters, otherwise assume km or use raw
          const splitDist = split.distance ? (split.distance > 100 ? (split.distance / 1000).toFixed(2) : split.distance) : '';
          const splitPace = calculateSplitPace(split);
          // Use elapsed_time if available (common in Strava), else fallback
          const splitTime = split.elapsed_time ? formatSplitTime(split.elapsed_time) : (split.time || '');

          const row = [
            `"${run.name || ''}"`,
            run.date || '',
            run.distance_km || '',
            run.pace || '',
            run.elapsed_time_min || '',
            `"${run.description || ''}"`,
            splits.length > 0 && split.distance ? index + 1 : '', // Only show split number if it's a real split
            splitDist,
            splitPace,
            splitTime
          ];
          csvContent += row.join(',') + '\n';
        });
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
      setError(err.message || 'An error occurred during export');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus('Getting existing activities from Firebase...');
      
      // Step 1: Get existing activity IDs from Firebase
      const existingIds = await getExistingActivityIds();
      console.log(`Found ${existingIds.size} existing activities in Firebase`);

      setStatus('Fetching latest activities from Strava...');
      
      // Step 2: Fetch from Strava API
      const serverlessUrl = import.meta.env.VITE_SEREVRLESS;
      const apiUrl = `${serverlessUrl.replace(/\/$/, "")}/api/activities`;

      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Strava API Error: ${res.status} - ${res.statusText}`);
      }

      const data = await res.json();
      console.log(`Received ${data.length} activities from Strava`);
      console.log('Sample activity data:', data[0]); // Debug log

      setStatus('Processing and saving new activities...');

      // Step 3: Transform data to match expected format
      const transformedData = data
        .filter(activity => activity && activity.id) // Filter out invalid activities
        .map(activity => ({
          id: activity.id,
          name: activity.name || 'Untitled Activity',
          date: activity.date || new Date().toLocaleDateString(),
          distance_km: parseFloat(activity.distance_km) || 0,
          pace: formatPace(activity.pace_min_per_km) || 'N/A',
          description: activity.description || 'No description',
          elapsed_time_min: activity.elapsed_time_min || 0,
          splits: activity.splits || []
        }));

      console.log(`Transformed ${transformedData.length} valid activities`);

      // Step 4: Save only new activities to Firebase
      const saveResult = await saveNewActivitiesToFirebase(transformedData, existingIds);
      
      setResult(saveResult);
      setStatus('✅ Refresh completed successfully!');

    } catch (err) {
      console.error('Refresh error:', err);
      setError(err.message || 'An error occurred during refresh');
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
            onClick={() => navigate("/runs")}
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
                  onClick={() => navigate("/runs")}
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