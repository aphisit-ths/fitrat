import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, TrendingDown, Target, Activity, Coffee, Utensils, Scale, Clock, Wifi, WifiOff, Download, X, AlertCircle } from 'lucide-react';
import { profileService, weightService, workoutService, checkSupabaseConnection } from './lib/supabase';

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

  // สร้างข้อมูลน้ำหนักสำหรับกราฟ
  const generateWeightChartData = () => {
    const sortedHistory = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    return sortedHistory.slice(-14).map(entry => ({
      date: getDisplayDate(entry.date),
      weight: entry.weight,
      target: 90
    }));
  };

  // สร้างข้อมูลการออกกำลังกายสำหรับกราฟ
  const generateWorkoutChartData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = getDateString(date);
      const workoutInfo = workoutData[dateString];
      
      data.push({
        date: getDisplayDate(dateString),
        duration: workoutInfo ? workoutInfo.duration || 0 : 0
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

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 text-${color}-500`} />
        <span className={`text-xs text-${color}-500 font-medium`}>{subtitle}</span>
      </div>
      <h3 className="text-lg font-bold text-gray-800">{value}</h3>
      <p className="text-xs text-gray-500">{title}</p>
    </div>
  );

  const WeightInput = () => {
    const [inputWeight, setInputWeight] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleSubmit = async () => {
      if (inputWeight && !isNaN(inputWeight) && parseFloat(inputWeight) > 0) {
        const newWeight = parseFloat(inputWeight);
        const today = getDateString();
        
        setIsSubmitting(true);
        try {
          // Update local state immediately
          setCurrentWeight(newWeight);
          const newHistory = [...weightHistory.filter(entry => entry.date !== today), { date: today, weight: newWeight }];
          setWeightHistory(newHistory);
          
          // Save to localStorage
          saveToStorage('currentWeight', newWeight);
          saveToStorage('weightHistory', newHistory);
          
          if (isOnline) {
            try {
              // Try to sync immediately
              await weightService.addWeightEntry(today, newWeight);
              await profileService.updateProfile({ current_weight: newWeight });
              setSyncStatus('synced');
            } catch (error) {
              // Add to pending sync if online sync fails
              addToPendingSync({ type: 'weight', date: today, weight: newWeight });
              setSyncStatus('error');
            }
          } else {
            // Add to pending sync for offline mode
            addToPendingSync({ type: 'weight', date: today, weight: newWeight });
          }
          
          setInputWeight('');
          alert('บันทึกน้ำหนักเรียบร้อย!');
        } catch (error) {
          console.error('Error saving weight:', error);
          alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
          setIsSubmitting(false);
        }
      }
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
          <Scale className="w-4 h-4 mr-2 text-blue-500" />
          บันทึกน้ำหนักวันนี้
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            placeholder="กก."
            value={inputWeight}
            onChange={(e) => setInputWeight(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '...' : 'บันทึก'}
          </button>
        </div>
      </div>
    );
  };

  const HeatmapCalendar = () => {
    const heatmapData = generateHeatmapData();
    
    const getIntensityColor = (intensity) => {
      const colors = [
        'bg-gray-100', // 0 - ไม่ได้ออกกำลังกาย
        'bg-green-200', // 1 - น้อย
        'bg-green-400', // 2 - ปานกลาง  
        'bg-green-600', // 3 - มาก
        'bg-green-800'  // 4 - มากที่สุด
      ];
      return colors[intensity] || colors[0];
    };

    const getWeeksData = () => {
      const weeks = [];
      let currentWeek = [];
      
      // เติมช่องว่างสำหรับวันแรกของสัปดาห์
      const firstDay = heatmapData[0];
      const startDayOfWeek = new Date(firstDay.date).getDay();
      for (let i = 0; i < startDayOfWeek; i++) {
        currentWeek.push(null);
      }
      
      heatmapData.forEach((day, index) => {
        currentWeek.push(day);
        
        if (currentWeek.length === 7) {
          weeks.push([...currentWeek]);
          currentWeek = [];
        }
      });
      
      // เติมช่องว่างสำหรับสัปดาห์สุดท้าย
      while (currentWeek.length < 7 && currentWeek.length > 0) {
        currentWeek.push(null);
      }
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }
      
      return weeks;
    };

    const weeks = getWeeksData();
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">ประวัติการออกกำลังกาย</h3>
          <span className="text-xs text-gray-500">90 วันย้อนหลัง</span>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
          <span>น้อย</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map(intensity => (
              <div
                key={intensity}
                className={`w-3 h-3 rounded-sm ${getIntensityColor(intensity)}`}
              />
            ))}
          </div>
          <span>มาก</span>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-2">
              <div className="h-3"></div> {/* Spacer for month labels */}
              {dayNames.map((day, index) => (
                <div key={index} className="h-3 text-xs text-gray-400 flex items-center">
                  {index % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>
            
            {/* Calendar weeks */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {/* Month label */}
                <div className="h-3 text-xs text-gray-400">
                  {week[0] && new Date(week[0].date).getDate() <= 7 
                    ? monthNames[new Date(week[0].date).getMonth()] 
                    : ''
                  }
                </div>
                
                {/* Week days */}
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`w-3 h-3 rounded-sm cursor-pointer hover:opacity-80 ${
                      day ? getIntensityColor(day.intensity) : 'bg-transparent'
                    }`}
                    title={day ? `${getDisplayDate(day.date)}: ${day.intensity > 0 ? 'ออกกำลังกาย' : 'พัก'}` : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-bold text-green-600">
              {heatmapData.filter(d => d.intensity > 0).length}
            </p>
            <p className="text-xs text-gray-500">วันที่ออกกำลังกาย</p>
          </div>
          <div>
            <p className="font-bold text-blue-600">
              {Math.round((heatmapData.filter(d => d.intensity > 0).length / 90) * 100)}%
            </p>
            <p className="text-xs text-gray-500">อัตราความสม่ำเสมอ</p>
          </div>
          <div>
            <p className="font-bold text-purple-600">
              {Math.max(...heatmapData.slice(-7).map(d => d.intensity))}
            </p>
            <p className="text-xs text-gray-500">ความเข้มข้นสูงสุด (7 วัน)</p>
          </div>
        </div>
      </div>
    );
  };

  const WorkoutTimer = () => {
    const today = getDateString();
    const todayWorkout = workoutData[today];
    const isWorkoutDone = todayWorkout && todayWorkout.completed;
    const isWorkoutRunning = todayWorkout && todayWorkout.startTime && !todayWorkout.completed;
    
    const [currentTime, setCurrentTime] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      let interval;
      if (isWorkoutRunning) {
        const startTime = new Date(todayWorkout.startTime).getTime();
        interval = setInterval(() => {
          const now = new Date().getTime();
          const elapsed = Math.floor((now - startTime) / 1000);
          setCurrentTime(elapsed);
        }, 1000);
      }
      return () => clearInterval(interval);
    }, [isWorkoutRunning, todayWorkout]);

    const formatTime = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const handleWorkoutAction = async () => {
      setIsSubmitting(true);
      try {
        const newWorkoutData = { ...workoutData };
        
        if (isWorkoutDone) {
          const confirmReset = window.confirm('ต้องการรีเซ็ตการออกกำลังกายวันนี้หรือไม่?');
          if (confirmReset) {
            delete newWorkoutData[today];
            setCurrentTime(0);
            
            if (isOnline) {
              try {
                await workoutService.deleteWorkoutEntry(today);
              } catch (error) {
                // Handle silently, will be synced later
              }
            }
          } else {
            return;
          }
        } else if (isWorkoutRunning) {
          const startTime = new Date(todayWorkout.startTime).getTime();
          const endTime = new Date().getTime();
          const totalSeconds = Math.floor((endTime - startTime) / 1000);
          const totalMinutes = Math.round(totalSeconds / 60);
          
          const workoutEntry = {
            ...todayWorkout,
            completed: true,
            endTime: new Date().toISOString(),
            duration: totalMinutes,
            actualSeconds: totalSeconds,
            intensity: totalMinutes >= 45 ? 4 : totalMinutes >= 30 ? 3 : totalMinutes >= 15 ? 2 : 1
          };
          
          newWorkoutData[today] = workoutEntry;
          setCurrentTime(0);
          
          if (isOnline) {
            try {
              await workoutService.upsertWorkoutEntry(today, workoutEntry);
            } catch (error) {
              addToPendingSync({ type: 'workout', date: today, data: workoutEntry });
            }
          } else {
            addToPendingSync({ type: 'workout', date: today, data: workoutEntry });
          }
        } else {
          const workoutEntry = {
            startTime: new Date().toISOString(),
            completed: false
          };
          
          newWorkoutData[today] = workoutEntry;
          
          if (isOnline) {
            try {
              await workoutService.upsertWorkoutEntry(today, workoutEntry);
            } catch (error) {
              addToPendingSync({ type: 'workout', date: today, data: workoutEntry });
            }
          } else {
            addToPendingSync({ type: 'workout', date: today, data: workoutEntry });
          }
        }
        
        setWorkoutData(newWorkoutData);
        saveToStorage('workoutData', newWorkoutData);
      } catch (error) {
        console.error('Error handling workout action:', error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
      } finally {
        setIsSubmitting(false);
      }
    };

    const getButtonStyle = () => {
      if (isWorkoutDone) return 'bg-green-50 border-green-200 text-green-700';
      if (isWorkoutRunning) return 'bg-orange-50 border-orange-200 text-orange-700 animate-pulse';
      return 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50';
    };

    const getButtonText = () => {
      if (isWorkoutDone) {
        const duration = todayWorkout.duration || 0;
        return `✓ เสร็จแล้ว (${duration} นาที) - กดเพื่อรีเซ็ต`;
      }
      if (isWorkoutRunning) return `🏃 กำลังออกกำลังกาย ${formatTime(currentTime)}`;
      return '▶️ เริ่มออกกำลังกาย';
    };

    const getButtonIcon = () => {
      if (isWorkoutDone) return <Activity className="w-5 h-5 mr-2 text-green-600" />;
      if (isWorkoutRunning) return <Clock className="w-5 h-5 mr-2 text-orange-600" />;
      return <Activity className="w-5 h-5 mr-2" />;
    };

    return (
      <div className="space-y-3">
        <button
          onClick={handleWorkoutAction}
          disabled={isSubmitting}
          className={`p-4 rounded-2xl border transition-colors w-full disabled:opacity-50 ${getButtonStyle()}`}
        >
          <div className="flex items-center justify-center">
            {getButtonIcon()}
            <span className="text-sm font-medium">
              {isSubmitting ? 'กำลังบันทึก...' : getButtonText()}
            </span>
          </div>
        </button>
        
        {isWorkoutRunning && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
            <div className="text-lg font-bold text-orange-700 mb-1">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-orange-600">
              💪 สู้ต่อไป! กดปุ่มด้านบนเมื่อเสร็จ
            </div>
          </div>
        )}
        
        {isWorkoutDone && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
            <div className="text-sm text-green-700">
              🎉 เยี่ยมมาก! วันนี้ออกกำลังกาย {todayWorkout.duration} นาที
            </div>
            <div className="text-xs text-green-600 mt-1">
              💾 ข้อมูลถูกบันทึกแล้ว - กดปุ่มด้านบนเพื่อรีเซ็ตและเริ่มใหม่
            </div>
          </div>
        )}
      </div>
    );
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-3 z-50 shadow-lg">
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
                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium"
              >
                ติดตั้ง
              </button>
              <button
                onClick={dismissInstallPrompt}
                className="text-white hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className={`bg-orange-500 text-white text-center py-2 text-sm ${showInstallPrompt ? 'mt-16' : ''}`}>
          <WifiOff className="w-4 h-4 inline mr-2" />
          ออฟไลน์ - ข้อมูลจะซิงค์เมื่อกลับมาออนไลน์
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500 text-white text-center py-2 text-sm">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-200 hover:text-white"
          >
            <X className="w-4 h-4 inline" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 ${showInstallPrompt ? 'mt-16' : ''}`}>
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold mb-1">Oat's Fitness Journey</h1>
            <p className="text-blue-100 text-sm">เป้าหมาย: 105 → 90 กก.</p>
          </div>
          <div className="flex items-center space-x-2">
            <SyncStatusIndicator />
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-300" />
            ) : (
              <WifiOff className="w-5 h-5 text-orange-300" />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Progress Overview */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">ความคืบหน้า</h2>
              <p className="text-sm text-gray-500">ลดไปแล้ว {currentData.totalLoss.toFixed(1)} กก.</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{Math.round(currentData.progressPercent)}%</div>
              <div className="text-xs text-gray-500">ความสำเร็จ</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-gray-800">{currentData.startWeight}</p>
              <p className="text-xs text-gray-500">เริ่มต้น</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{currentData.currentWeight}</p>
              <p className="text-xs text-gray-500">ปัจจุบัน</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{currentData.targetWeight}</p>
              <p className="text-xs text-gray-500">เป้าหมาย</p>
            </div>
          </div>
        </div>

        {/* Weight Input */}
        <WeightInput />

        {/* Today's Stats */}
        <div className="grid grid-cols-1 gap-3">
          <StatCard
            icon={TrendingDown}
            title="ลดไปแล้ว"
            value={`${currentData.totalLoss.toFixed(1)} กก.`}
            subtitle="เป้าหมาย 15 กก."
            color="green"
          />
        </div>

        {/* Heatmap Calendar */}
        <HeatmapCalendar />

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
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
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          {activeTab === 'weight' && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">กราฟน้ำหนัก (14 วันล่าสุด)</h3>
              {generateWeightChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={generateWeightChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} fontSize={12} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      stroke="#ef4444" 
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
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
              <h3 className="font-semibold text-gray-800 mb-4">การออกกำลังกาย (14 วันล่าสุด)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={generateWorkoutChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="duration" fill="#10b981" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3">
          <WorkoutTimer />
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-100">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
            <Target className="w-4 h-4 mr-2 text-blue-500" />
            เทป ประจำวัน
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• ดื่มน้ำ 2-2.5 ลิตรต่อวัน</li>
            <li>• ทานช้าๆ เคี้ยวให้ละเอียด</li>
            <li>• ออกกำลังกายตอนเช้า</li>
            <li>• ชั่งน้ำหนักทุกเช้า</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4">
          <div>สู้ๆ โอ๊ต! เป้าหมายอยู่ไม่ไกลแล้ว 💪</div>
          <div className="mt-1">📱 PWA Ready - ติดตั้งผ่าน browser ได้</div>
          {!showInstallPrompt && !deferredPrompt && (
            <div className="mt-1 text-green-600">✅ แอปพร้อมใช้งานออฟไลน์</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FitnessTracker;