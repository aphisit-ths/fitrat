import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingDown, Target, Activity, Clock, Wifi, WifiOff, Download, X, AlertCircle, Scale } from 'lucide-react';
import { profileService, weightService, workoutService, checkSupabaseConnection } from './lib/supabase';
import GoalTracker from './components/GoalTracker';
import WorkoutTypes from './components/WorkoutTypes';
import ProgressOverview from './components/ProgressOverview';
import TodayStats from './components/TodayStats';
import HeatmapCalendar from './components/HeatmapCalendar';
import WeightInput from './components/WeightInput';
import { goalService } from './lib/goalService';

const FitnessTracker = () => {
  const [activeTab, setActiveTab] = useState('weight');
  const [currentWeight, setCurrentWeight] = useState(105.0);
  const [workoutData, setWorkoutData] = useState({});
  const [weightHistory, setWeightHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  // New states for Supabase integration
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error', 'offline'
  const [error, setError] = useState(null);
  const [pendingSync, setPendingSync] = useState([]);
  const [goals, setGoals] = useState([]);

  // PWA Install Prompt Detection
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // PWA Online/Offline Detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingChanges();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load initial data from Supabase
  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && pendingSync.length > 0) {
      syncPendingChanges();
    }
  }, [isOnline, pendingSync]);

  // Load goals on mount
  useEffect(() => {
    const savedGoals = goalService.getGoals();
    setGoals(savedGoals);
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if we can connect to Supabase
      const canConnect = await checkSupabaseConnection();
      
      if (canConnect) {
        // Load from Supabase
        const [profile, weights, workouts] = await Promise.all([
          profileService.getProfile(),
          weightService.getWeightEntries(),
          workoutService.getWorkoutEntries()
        ]);

        // Set current weight from profile or latest weight entry
        if (profile?.current_weight) {
          setCurrentWeight(profile.current_weight);
        } else if (weights.length > 0) {
          const latest = weights[weights.length - 1];
          setCurrentWeight(latest.weight);
        }

        setWeightHistory(weights);
        
        // Convert workout entries to the format expected by the UI
        const workoutMap = {};
        workouts.forEach(workout => {
          workoutMap[workout.date] = {
            id: workout.id,
            startTime: workout.start_time,
            endTime: workout.end_time,
            duration: workout.duration,
            intensity: workout.intensity,
            completed: workout.completed,
            actualSeconds: workout.actual_seconds,
            type: workout.workout_type
          };
        });
        setWorkoutData(workoutMap);
        
        setSyncStatus('synced');
        
        // Save to localStorage as backup
        saveToStorage('currentWeight', profile?.current_weight || weights[weights.length - 1]?.weight || 105.0);
        saveToStorage('weightHistory', weights);
        saveToStorage('workoutData', workoutMap);
      } else {
        // Load from localStorage as fallback
        loadFromLocalStorage();
        setSyncStatus('offline');
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่');
      loadFromLocalStorage();
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    const storedWeight = getFromStorage('currentWeight', 105.0);
    const storedWorkoutData = getFromStorage('workoutData', {});
    const storedWeightHistory = getFromStorage('weightHistory', []);
    
    setCurrentWeight(storedWeight);
    setWorkoutData(storedWorkoutData);
    setWeightHistory(storedWeightHistory);
  };

  const syncPendingChanges = async () => {
    if (!isOnline || pendingSync.length === 0) return;
    
    try {
      setSyncStatus('syncing');
      
      for (const change of pendingSync) {
        switch (change.type) {
          case 'weight':
            await weightService.addWeightEntry(change.date, change.weight);
            await profileService.updateProfile({ current_weight: change.weight });
            break;
          case 'workout':
            await workoutService.upsertWorkoutEntry(change.date, change.data);
            break;
        }
      }
      
      setPendingSync([]);
      setSyncStatus('synced');
      setError(null);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setError('ไม่สามารถซิงค์ข้อมูลได้');
    }
  };

  const addToPendingSync = (change) => {
    setPendingSync(prev => [...prev.filter(p => !(p.type === change.type && p.date === change.date)), change]);
  };

  // ฟังก์ชันสำหรับจัดการ localStorage
  const saveToStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const getFromStorage = (key, defaultValue = null) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  };

  // ฟังก์ชันช่วยสำหรับวันที่
  const getDateString = (date = new Date()) => {
    return date.toISOString().split('T')[0];
  };

  const getDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // สร้างข้อมูลสำหรับ heatmap (90 วันย้อนหลัง)
  const generateHeatmapData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = getDateString(date);
      
      const workoutInfo = workoutData[dateString];
      const intensity = workoutInfo ? workoutInfo.intensity || 1 : 0;
      
      data.push({
        date: dateString,
        intensity: intensity,
        day: date.getDate(),
        month: date.getMonth(),
        weekday: date.getDay()
      });
    }
    return data;
  };

  const currentData = {
    startWeight: 105.0,
    currentWeight: currentWeight,
    targetWeight: 90.0,
    finalTarget: 75.0,
    totalLoss: 105.0 - currentWeight,
    progressPercent: ((105.0 - currentWeight) / (105.0 - 90.0)) * 100
  };

  const generateWeightChartData = () => {
    const sortedHistory = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    return sortedHistory.slice(-14).map(entry => ({
      date: getDisplayDate(entry.date),
      weight: entry.weight,
      target: 90
    }));
  };

  // สร้างข้อมูลการออกกำลังกายสำหรับกราฟ - แก้ไขปัญหา duration ไม่แสดง
  const generateWorkoutChartData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = getDateString(date);
      const workoutInfo = workoutData[dateString];
      
      let duration = 0;
      if (workoutInfo) {
        // ลองหาค่า duration จากหลายแหล่ง
        duration = workoutInfo.duration || 0;
        
        // ถ้าไม่มี duration แต่มี actualSeconds ให้แปลงเป็นนาที
        if (!duration && workoutInfo.actualSeconds) {
          duration = Math.round(workoutInfo.actualSeconds / 60);
        }
        
        // ถ้าไม่มี duration แต่มี startTime และ endTime
        if (!duration && workoutInfo.startTime && workoutInfo.endTime) {
          const start = new Date(workoutInfo.startTime);
          const end = new Date(workoutInfo.endTime);
          duration = Math.round((end - start) / (1000 * 60)); // แปลงเป็นนาที
        }
      }
      
      data.push({
        date: getDisplayDate(dateString),
        duration: duration,
        rawDate: dateString
      });
    }
    return data;
  };

  // Sync Status Component
  const SyncStatusIndicator = () => {
    const getSyncIcon = () => {
      switch (syncStatus) {
        case 'syncing':
          return <Clock className="w-4 h-4 animate-spin text-blue-500" />;
        case 'error':
          return <AlertCircle className="w-4 h-4 text-red-500" />;
        case 'offline':
          return <WifiOff className="w-4 h-4 text-orange-500" />;
        default:
          return <Wifi className="w-4 h-4 text-green-500" />;
      }
    };

    const getSyncText = () => {
      switch (syncStatus) {
        case 'syncing':
          return 'กำลังซิงค์...';
        case 'error':
          return 'ซิงค์ไม่สำเร็จ';
        case 'offline':
          return `ออฟไลน์ (${pendingSync.length} รายการรอซิงค์)`;
        default:
          return 'ซิงค์แล้ว';
      }
    };

    if (syncStatus === 'synced' && pendingSync.length === 0) return null;

    return (
      <div className="flex items-center space-x-1 text-xs">
        {getSyncIcon()}
        <span>{getSyncText()}</span>
      </div>
    );
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500 mx-auto mb-4"></div>
          <p className="text-gray-400">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed top-0 left-0 right-0 bg-gray-900 text-white p-3 z-50 shadow-lg border-b border-gray-800">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <Download className="w-5 h-5 mr-2" />
              <div>
                <p className="text-sm font-medium">ติดตั้งแอป Fitness Rat</p>
                <p className="text-xs opacity-90">ใช้งานได้แม้ไม่มีอินเทอร์เน็ต</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleInstallApp}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700"
              >
                ติดตั้ง
              </button>
              <button
                onClick={dismissInstallPrompt}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className={`bg-gray-800 text-gray-300 text-center py-2 text-sm border-b border-gray-700 ${showInstallPrompt ? 'mt-16' : ''}`}>
          <WifiOff className="w-4 h-4 inline mr-2" />
          ออฟไลน์ - ข้อมูลจะซิงค์เมื่อกลับมาออนไลน์
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-gray-900 text-gray-300 text-center py-2 text-sm border-b border-gray-800">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-white"
          >
            <X className="w-4 h-4 inline" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className={`bg-gradient-to-r from-black to-gray-900 text-white p-4 border-b border-gray-800 ${showInstallPrompt ? 'mt-16' : ''}`}>
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold mb-1">Oat's Fitness Journey</h1>
            <p className="text-gray-400 text-sm">เป้าหมาย: 105 → 90 กก.</p>
          </div>
          <div className="flex items-center space-x-2">
            <SyncStatusIndicator />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Progress Overview */}
        <ProgressOverview currentData={currentData} />

        {/* Goals & Streaks */}
        <GoalTracker 
          workoutData={workoutData}
          goals={goals}
          onUpdateGoal={handleUpdateGoals}
        />

        {/* Today's Stats */}
        <TodayStats currentData={currentData} />

        {/* Heatmap Calendar */}
        <HeatmapCalendar workoutData={workoutData} />

        {/* Navigation Tabs */}
        <div className="bg-black rounded-2xl p-1 shadow-xl border border-gray-800">
          <div className="grid grid-cols-2 gap-1">
            {[
              { id: 'weight', label: 'น้ำหนัก', icon: TrendingDown },
              { id: 'workout', label: 'ออกกำลังกาย', icon: Activity }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center py-3 px-2 rounded-xl transition-colors ${
                  activeTab === id 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-500 hover:bg-gray-900 hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="bg-black rounded-2xl p-4 shadow-xl border border-gray-800">
          {activeTab === 'weight' && (
            <div>
              <h3 className="font-semibold text-white mb-4">กราฟน้ำหนัก (14 วันล่าสุด)</h3>
              {generateWeightChartData().length > 0 ? (
                <div className="bg-gray-900 rounded-xl p-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={generateWeightChartData()} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        {/* Gradient สำหรับเส้นน้ำหนัก */}
                        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f3f4f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f3f4f6" stopOpacity={0.1}/>
                        </linearGradient>
                        {/* Gradient สำหรับเส้นเป้าหมาย */}
                        <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6b7280" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#6b7280" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="1 3" stroke="#374151" strokeWidth={0.5} />
                      <XAxis 
                        dataKey="date" 
                        fontSize={11} 
                        stroke="#6b7280" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ dy: 5 }}
                      />
                      <YAxis 
                        domain={['dataMin - 1', 'dataMax + 1']}
                        fontSize={11}
                        stroke="#6b7280"
                        axisLine={false}
                        tickLine={false}
                        tick={{ dx: -5 }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderRadius: '0.375rem' }}
                        labelStyle={{ color: '#9ca3af', fontSize: '0.875rem' }}
                        itemStyle={{ color: '#f3f4f6', fontSize: '0.875rem' }}
                        formatter={(value, name, props) => {
                          if (name === 'weight') {
                            return [`น้ำหนัก: ${value} กก.`];
                          }
                          return [`${name}: ${value}`];
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="url(#weightGradient)" 
                        strokeWidth={3} 
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="target" 
                        stroke="#6b7280" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Scale className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>ยังไม่มีข้อมูลน้ำหนัก</p>
                  <p className="text-sm">เริ่มบันทึกน้ำหนักเพื่อดูกราฟ</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'workout' && (
            <div>
              <h3 className="font-semibold text-white mb-4">การออกกำลังกาย (14 วันล่าสุด)</h3>
              <div className="bg-gray-900 rounded-xl p-3">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={generateWorkoutChartData()} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d1d5db" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#6b7280" stopOpacity={0.7}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="1 3" stroke="#374151" strokeWidth={0.5} />
                    <XAxis 
                      dataKey="date" 
                      fontSize={11} 
                      stroke="#6b7280"
                      axisLine={false}
                      tickLine={false}
                      tick={{ dy: 5 }}
                    />
                    <YAxis 
                      fontSize={11} 
                      stroke="#6b7280"
                      axisLine={false}
                      tickLine={false}
                      tick={{ dx: -5 }}
                      width={35}
                      label={{ value: 'นาที', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '10px' } }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #374151',
                        borderRadius: '12px',
                        color: '#f9fafb',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        fontSize: '12px'
                      }}
                      labelStyle={{ color: '#d1d5db', fontSize: '11px' }}
                      cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
                      formatter={(value) => [`${value} นาที`, 'ระยะเวลา']}
                    />
                    <Bar 
                      dataKey="duration" 
                      fill="url(#barGradient)" 
                      radius={[4, 4, 0, 0]}
                      stroke="#9ca3af"
                      strokeWidth={0.5}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* แสดงข้อมูลสรุป - พร้อมสีสวยงาม */}
              <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
                <div className="bg-gray-800 rounded-lg p-2 border border-blue-500/20">
                  <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Clock className="w-3 h-3 text-white" />
                  </div>
                  <p className="font-bold text-blue-300">
                    {generateWorkoutChartData().reduce((sum, day) => sum + day.duration, 0)}
                  </p>
                  <p className="text-gray-500">รวม (นาที)</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 border border-green-500/20">
                  <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Activity className="w-3 h-3 text-white" />
                  </div>
                  <p className="font-bold text-green-300">
                    {generateWorkoutChartData().filter(day => day.duration > 0).length}
                  </p>
                  <p className="text-gray-500">วันที่ออกกำลัง</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 border border-purple-500/20">
                  <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <TrendingDown className="w-3 h-3 text-white" />
                  </div>
                  <p className="font-bold text-purple-300">
                    {Math.round(generateWorkoutChartData().reduce((sum, day) => sum + day.duration, 0) / 14)}
                  </p>
                  <p className="text-gray-500">เฉลี่ย/วัน</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions - Workout Entry */}
        <WorkoutEntry />

        {/* Weight Input */}
        <WeightInput 
          weightHistory={weightHistory}
          setCurrentWeight={setCurrentWeight}
          setWeightHistory={setWeightHistory}
          saveToStorage={saveToStorage}
          isOnline={isOnline}
          weightService={weightService}
          profileService={profileService}
          setSyncStatus={setSyncStatus}
          addToPendingSync={addToPendingSync}
        />

        {/* Tips */}
        <div className="bg-gradient-to-r from-black to-gray-900 rounded-2xl p-4 border border-gray-800">
          <h3 className="font-semibold text-white mb-2 flex items-center">
            <Target className="w-4 h-4 mr-2 text-gray-400" />
            เทป ประจำวัน
          </h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• ดื่มน้ำ 2-2.5 ลิตรต่อวัน</li>
            <li>• ทานช้าๆ เคี้ยวให้ละเอียด</li>
            <li>• ออกกำลังกายตอนเช้า</li>
            <li>• ชั่งน้ำหนักทุกเช้า</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 py-4">
          <div>สู้ๆ โอ๊ต! เป้าหมายอยู่ไม่ไกลแล้ว 💪</div>
          <div className="mt-1">📱 PWA Ready - ติดตั้งผ่าน browser ได้</div>
          {!showInstallPrompt && !deferredPrompt && (
            <div className="mt-1 text-gray-500">✅ แอปพร้อมใช้งานออฟไลน์</div>
          )}
        </div>
      </div>
    </div>
  );

  // WorkoutEntry Component - ย้ายมาอยู่ใน App.jsx
  function WorkoutEntry() {
    const [selectedDate, setSelectedDate] = useState(getDateString());
    const [duration, setDuration] = useState('');
    const [intensity, setIntensity] = useState(2);
    const [workoutType, setWorkoutType] = useState('general');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState(null);
    const [showWorkoutList, setShowWorkoutList] = useState(false);

    const quickDurations = [15, 30, 45, 60];
    const intensityLabels = {
      1: 'เบา',
      2: 'ปานกลาง', 
      3: 'หนัก',
      4: 'หนักมาก'
    };

    const handleQuickDuration = (minutes) => {
      setDuration(minutes.toString());
      if (minutes >= 60) setIntensity(4);
      else if (minutes >= 45) setIntensity(3);
      else if (minutes >= 30) setIntensity(2);
      else setIntensity(1);
    };

    const generateUUID = () => {
      if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const handleSubmit = async () => {
      if (!duration || !selectedDate || parseFloat(duration) <= 0) {
        alert('กรุณากรอกวันที่และระยะเวลาให้ถูกต้อง');
        return;
      }

      setIsSubmitting(true);
      try {
        const workoutEntry = {
          ...(editingWorkout?.id && { id: editingWorkout.id }),
          date: selectedDate,
          duration: parseInt(duration),
          intensity: intensity,
          workout_type: workoutType,
          completed: true,
          startTime: new Date(selectedDate + 'T08:00:00').toISOString(),
          endTime: new Date(selectedDate + 'T08:00:00').toISOString(),
          actualSeconds: parseInt(duration) * 60
        };

        const localWorkoutEntry = {
          ...workoutEntry,
          id: editingWorkout?.id || generateUUID()
        };

        const newWorkoutData = { ...workoutData };
        newWorkoutData[selectedDate] = localWorkoutEntry;
        setWorkoutData(newWorkoutData);
        saveToStorage('workoutData', newWorkoutData);

        if (isOnline) {
          try {
            const result = await workoutService.upsertWorkoutEntry(selectedDate, workoutEntry);
            if (result?.id) {
              newWorkoutData[selectedDate] = { ...workoutEntry, id: result.id };
              setWorkoutData(newWorkoutData);
              saveToStorage('workoutData', newWorkoutData);
            }
            setSyncStatus('synced');
          } catch (error) {
            addToPendingSync({ type: 'workout', date: selectedDate, data: workoutEntry });
            setSyncStatus('error');
          }
        } else {
          addToPendingSync({ type: 'workout', date: selectedDate, data: workoutEntry });
        }

        setDuration('');
        setIntensity(2);
        setWorkoutType('general');
        setEditingWorkout(null);
        setSelectedDate(getDateString());
        
        alert(editingWorkout ? 'แก้ไขข้อมูลเรียบร้อย!' : 'บันทึกการออกกำลังกายเรียบร้อย!');
      } catch (error) {
        console.error('Error saving workout:', error);
        alert('เกิดข้อผิดพลาดในการบันทึก');
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleEdit = (date, workout) => {
      setEditingWorkout({ ...workout, date });
      setSelectedDate(date);
      setDuration(workout.duration.toString());
      setIntensity(workout.intensity);
      setWorkoutType(workout.workout_type || 'general');
      setShowWorkoutList(false);
    };

    const handleDelete = async (date) => {
      if (!window.confirm('ต้องการลบข้อมูลการออกกำลังกายนี้หรือไม่?')) return;

      try {
        const newWorkoutData = { ...workoutData };
        delete newWorkoutData[date];
        setWorkoutData(newWorkoutData);
        saveToStorage('workoutData', newWorkoutData);

        if (isOnline) {
          try {
            await workoutService.deleteWorkoutEntry(date);
          } catch (error) {
            // Handle silently
          }
        }

        alert('ลบข้อมูลเรียบร้อย!');
      } catch (error) {
        console.error('Error deleting workout:', error);
        alert('เกิดข้อผิดพลาดในการลบ');
      }
    };

    const getRecentWorkouts = () => {
      const workouts = [];
      const today = new Date();
      
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = getDateString(date);
        
        if (workoutData[dateString]) {
          workouts.push({
            date: dateString,
            ...workoutData[dateString]
          });
        }
      }
      
      return workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const recentWorkouts = getRecentWorkouts();

    return (
      <div className="space-y-4">
        {/* Workout Form */}
        <div className="bg-black rounded-2xl p-4 shadow-xl border border-gray-800">
          <h3 className="font-semibold text-white mb-4 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-blue-400" />
            {editingWorkout ? 'แก้ไขการออกกำลังกาย' : 'บันทึกการออกกำลังกาย'}
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">วันที่</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <WorkoutTypes 
              selectedType={workoutType}
              onTypeChange={setWorkoutType}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">ระยะเวลา (นาที)</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {quickDurations.map(minutes => (
                <button
                  key={minutes}
                  onClick={() => handleQuickDuration(minutes)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    duration === minutes.toString()
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {minutes}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="300"
              placeholder="หรือกรอกเอง"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">ความเข้มข้น</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(level => (
                <button
                  key={level}
                  onClick={() => setIntensity(level)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                    intensity === level
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {intensityLabels[level]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : editingWorkout ? 'แก้ไข' : 'บันทึก'}
            </button>
            
            {editingWorkout && (
              <button
                onClick={() => {
                  setEditingWorkout(null);
                  setDuration('');
                  setIntensity(2);
                  setWorkoutType('general');
                  setSelectedDate(getDateString());
                }}
                className="py-2 px-4 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </div>

        {/* Workout List */}
        <div className="bg-black rounded-2xl p-4 shadow-xl border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center">
              <Activity className="w-4 h-4 mr-2 text-gray-400" />
              การออกกำลังกายล่าสุด
            </h3>
            <button
              onClick={() => setShowWorkoutList(!showWorkoutList)}
              className="text-blue-400 text-sm hover:text-blue-300"
            >
              {showWorkoutList ? 'ซ่อน' : `ดูทั้งหมด (${recentWorkouts.length})`}
            </button>
          </div>

          {showWorkoutList && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentWorkouts.length > 0 ? (
                recentWorkouts.map(workout => (
                  <div
                    key={workout.date}
                    className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">
                          {getDisplayDate(workout.date)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {intensityLabels[workout.intensity]}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {workout.duration} นาที
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-3">
                      <button
                        onClick={() => handleEdit(workout.date, workout)}
                        className="text-blue-400 hover:text-blue-300 text-xs p-1"
                        title="แก้ไข"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(workout.date)}
                        className="text-red-400 hover:text-red-300 text-xs p-1"
                        title="ลบ"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">ยังไม่มีข้อมูลการออกกำลังกาย</p>
                </div>
              )}
            </div>
          )}

          {recentWorkouts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-700">
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="bg-gray-800/50 rounded-lg p-2 border border-orange-500/20">
                  <div className="w-4 h-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Clock className="w-2 h-2 text-white" />
                  </div>
                  <p className="font-bold text-orange-300">
                    {recentWorkouts.reduce((sum, w) => sum + w.duration, 0)}
                  </p>
                  <p className="text-gray-500">รวม (นาที)</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 border border-blue-500/20">
                  <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Activity className="w-2 h-2 text-white" />
                  </div>
                  <p className="font-bold text-blue-300">
                    {recentWorkouts.length}
                  </p>
                  <p className="text-gray-500">วันที่ออกกำลัง</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 border border-green-500/20">
                  <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Target className="w-2 h-2 text-white" />
                  </div>
                  <p className="font-bold text-green-300">
                    {Math.round(recentWorkouts.reduce((sum, w) => sum + w.duration, 0) / 14)}
                  </p>
                  <p className="text-gray-500">เฉลี่ย/วัน</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function handleUpdateGoals(newGoals) {
    setGoals(newGoals);
    goalService.saveGoals(newGoals);
  }
};

export default FitnessTracker;
