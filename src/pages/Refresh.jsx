import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, setDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.config.js';

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
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-black text-white font-montserrat py-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <button
            className="px-6 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-all duration-200 border border-white/10 backdrop-blur-sm flex items-center gap-2"
            onClick={() => navigate("/runs")}
          >
            <span>←</span> Back to Runs
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-4">
            Refresh <span className="text-white/80">Data</span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Sync your latest Strava activities with Firebase. Only new activities will be added.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          
          {/* Status Display */}
          {status && (
            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                )}
                <span className="text-white/90">{status}</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 font-semibold">Error: {error}</p>
            </div>
          )}

          {/* Result Display */}
          {result && !loading && (
            <div className="mb-6 p-6 bg-green-900/20 border border-green-500/30 rounded-lg">
              <h3 className="text-green-400 font-bold text-lg mb-2">Refresh Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/60">Total from Strava:</span>
                  <span className="ml-2 font-bold text-white">{result.totalCount}</span>
                </div>
                <div>
                  <span className="text-white/60">New activities added:</span>
                  <span className="ml-2 font-bold text-green-400">{result.newCount}</span>
                </div>
              </div>
              {result.newCount === 0 && (
                <p className="text-white/60 mt-2 text-sm">All activities are already up to date!</p>
              )}
            </div>
          )}

          {/* Refresh Button */}
          <div className="text-center">
            <button
              onClick={refreshData}
              disabled={loading}
              className={`px-8 py-4 rounded-full text-white font-semibold text-lg transition-all duration-200 ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Syncing...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  🔄 Refresh from Strava
                </span>
              )}
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <h4 className="text-white font-semibold mb-3">How it works:</h4>
            <ul className="text-white/60 text-sm space-y-2">
              <li>• Fetches your latest 25 activities from Strava</li>
              <li>• Compares with existing activities in Firebase</li>
              <li>• Only adds new activities (no duplicates)</li>
              <li>• Preserves all existing data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Refresh;