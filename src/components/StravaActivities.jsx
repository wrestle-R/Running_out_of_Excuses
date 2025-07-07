import React, { useEffect, useState } from 'react';
import { collection, getDocs, setDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.config.js';
import { useNavigate } from 'react-router-dom';

const StravaActivities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('');
  const navigate = useNavigate();

  const saveActivitiesToFirebase = async (activities) => {
    try {
      const promises = activities.map(async (activity, index) => {
        const activityId = `activity_${new Date(activity.date).getTime()}_${index}`;
        await setDoc(doc(db, 'strava_activities', activityId), {
          ...activity,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
      await Promise.all(promises);
      console.log('✅ Activities saved to Firebase');
    } catch (error) {
      console.error('Error saving to Firebase:', error);
    }
  };

  const loadActivitiesFromFirebase = async () => {
    try {
      const q = query(collection(db, 'strava_activities'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const firebaseActivities = [];
      querySnapshot.forEach((doc) => {
        firebaseActivities.push(doc.data());
      });
      return firebaseActivities;
    } catch (error) {
      console.error('Error loading from Firebase:', error);
      return [];
    }
  };

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔄 Starting fetch from backend...');
        
        // Try to fetch from backend first
        const res = await fetch('http://localhost:3000/api/activities', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 Backend response:', res.status, res.statusText);
        
        if (res.status === 401) {
          // On 401, load from Firebase
          console.log('🔥 API token expired, loading from Firebase...');
          setDataSource('Firebase (API token expired)');
          const firebaseData = await loadActivitiesFromFirebase();
          setActivities(firebaseData);
          return;
        }
        
        if (res.status === 429) {
          // On 429, load from Firebase
          console.log('🔥 API rate limit exceeded, loading from Firebase...');
          const errorData = await res.json();
          console.log('📊 Rate limit info:', errorData.rateLimitInfo);
          setDataSource('Firebase (API rate limit exceeded)');
          const firebaseData = await loadActivitiesFromFirebase();
          setActivities(firebaseData);
          return;
        }
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Backend error:', errorText);
          throw new Error(`API Error: ${res.status} - ${errorText}`);
        }
        
        const data = await res.json();
        console.log('✅ Backend data received:', data.length, 'activities');
        setActivities(data);
        setDataSource('Strava API');
        
        // Save fresh data to Firebase for future use
        await saveActivitiesToFirebase(data);
        
      } catch (err) {
        console.error('❌ Fetch error:', err);
        
        // Check if it's a network error
        if (err.message.includes('fetch')) {
          setError('Cannot connect to backend. Make sure it\'s running on localhost:3000');
        } else {
          setError(err.message);
        }
        
        // Fallback to Firebase on any error
        console.log('🔥 Error occurred, loading from Firebase...');
        setDataSource('Firebase (fallback)');
        try {
          const firebaseData = await loadActivitiesFromFirebase();
          console.log('✅ Firebase data loaded:', firebaseData.length, 'activities');
          setActivities(firebaseData);
          if (firebaseData.length === 0) {
            setError('No data available. Backend connection failed and no Firebase data found.');
          }
        } catch (firebaseError) {
          console.error('❌ Firebase error:', firebaseError);
          setError(`All data sources failed: ${firebaseError.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6 font-montserrat">
      <div className="w-full max-w-7xl mx-auto">
        <button
          className="mb-8 px-5 py-2 rounded-full bg-white/10 text-white text-sm font-semibold shadow hover:bg-white/20 transition border border-white/10 backdrop-blur"
          onClick={() => navigate('/')}
        >
          ← Back to Home
        </button>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-4">
            Strava Activities
          </h1>
          {dataSource && (
            <p className="text-white/60 text-sm">Data source: {dataSource}</p>
          )}
        </div>

        {loading && (
          <div className="text-center text-lg text-white/80">Loading activities...</div>
        )}

        {error && !loading && activities.length === 0 && (
          <div className="text-center text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            {error}
          </div>
        )}

        {!loading && activities.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full bg-white/5 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-white/10 border-b border-white/10">
                  <th className="py-4 px-6 text-left font-semibold">Activity</th>
                  <th className="py-4 px-6 text-left font-semibold">Distance</th>
                  <th className="py-4 px-6 text-left font-semibold">Date</th>
                  <th className="py-4 px-6 text-left font-semibold">Time</th>
                  <th className="py-4 px-6 text-left font-semibold">Pace</th>
                  <th className="py-4 px-6 text-left font-semibold">Notes</th>
                  <th className="py-4 px-6 text-left font-semibold">Splits</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity, i) => (
                  <tr 
                    key={i} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium">{activity.name}</td>
                    <td className="py-4 px-6">
                      <span className="text-orange-400 font-bold">
                        {activity.distance_km} km
                      </span>
                    </td>
                    <td className="py-4 px-6 text-white/80">{activity.date}</td>
                    <td className="py-4 px-6 text-white/80">
                      {activity.elapsed_time_min ? `${activity.elapsed_time_min} min` : '-'}
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-sm">
                        {activity.pace_min_per_km ? `${activity.pace_min_per_km} min/km` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-white/80 max-w-xs">
                      <div className="truncate" title={activity.description}>
                        {activity.description || '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {activity.splits && activity.splits.length > 0 ? (
                        <div className="max-h-32 overflow-y-auto">
                          <table className="text-xs border border-white/20 rounded">
                            <thead>
                              <tr className="bg-white/10">
                                <th className="px-2 py-1">KM</th>
                                <th className="px-2 py-1">Pace</th>
                                <th className="px-2 py-1">Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activity.splits.map((split, j) => (
                                <tr key={j} className="border-t border-white/10">
                                  <td className="px-2 py-1 text-center">{split.km}</td>
                                  <td className="px-2 py-1 text-center">
                                    {split.pace_min_per_km || '-'}
                                  </td>
                                  <td className="px-2 py-1 text-center">
                                    {split.elapsed_time ? `${split.elapsed_time}s` : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activities.length === 0 && (
          <div className="text-center text-white/60 mt-8">
            No activities found.
          </div>
        )}
      </div>
    </div>
  );
};

export default StravaActivities;
