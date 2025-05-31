import React, { useState, useEffect } from 'react';
import { Target, Trophy, Flame, Calendar, CheckCircle, Circle, Clock, TrendingDown } from 'lucide-react';

const GoalTracker = ({ workoutData, onUpdateGoal, goals = [] }) => {
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    type: 'weekly_workouts',
    target: 3,
    period: 'week'
  });

  const goalTypes = {
    weekly_workouts: { label: 'ออกกำลังกาย X ครั้ง/สัปดาห์', unit: 'ครั้ง', icon: Target },
    weekly_minutes: { label: 'ออกกำลังกาย X นาที/สัปดาห์', unit: 'นาที', icon: Clock },
    daily_streak: { label: 'ออกกำลังกายต่อเนื่อง X วัน', unit: 'วัน', icon: Flame },
    weight_loss: { label: 'ลดน้ำหนัก X กก./เดือน', unit: 'กก.', icon: TrendingDown }
  };

  const calculateGoalProgress = (goal) => {
    const today = new Date();
    let startDate, endDate;
    
    if (goal.period === 'week') {
      const dayOfWeek = today.getDay();
      startDate = new Date(today);
      startDate.setDate(today.getDate() - dayOfWeek);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else if (goal.period === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    const dateRange = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateRange.push(d.toISOString().split('T')[0]);
    }

    let current = 0;
    if (goal.type === 'weekly_workouts') {
      current = dateRange.filter(date => workoutData[date]).length;
    } else if (goal.type === 'weekly_minutes') {
      current = dateRange.reduce((sum, date) => {
        return sum + (workoutData[date]?.duration || 0);
      }, 0);
    }

    return {
      current,
      target: goal.target,
      percentage: Math.min((current / goal.target) * 100, 100),
      isCompleted: current >= goal.target
    };
  };

  const getCurrentStreak = () => {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toISOString().split('T')[0];
      
      if (workoutData[dateString]) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const handleSubmitGoal = () => {
    if (!newGoal.title || !newGoal.target) return;
    
    const goal = {
      id: Date.now().toString(),
      ...newGoal,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    
    onUpdateGoal([...goals, goal]);
    setNewGoal({ title: '', type: 'weekly_workouts', target: 3, period: 'week' });
    setShowGoalForm(false);
  };

  const GoalCard = ({ goal }) => {
    const progress = calculateGoalProgress(goal);
    const goalType = goalTypes[goal.type];
    const Icon = goalType.icon;

    return (
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Icon className="w-5 h-5 text-blue-400 mr-2" />
            <h4 className="font-medium text-white text-sm">{goal.title}</h4>
          </div>
          {progress.isCompleted && (
            <Trophy className="w-5 h-5 text-yellow-500" />
          )}
        </div>
        
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{progress.current} / {progress.target} {goalType.unit}</span>
            <span>{Math.round(progress.percentage)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                progress.isCompleted ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
        
        <p className="text-xs text-gray-500">
          {goalType.label.replace('X', goal.target)}
        </p>
      </div>
    );
  };

  const currentStreak = getCurrentStreak();

  return (
    <div className="bg-black rounded-2xl p-4 shadow-xl border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center">
          <Target className="w-4 h-4 mr-2 text-blue-400" />
          เป้าหมาย & ความต่อเนื่อง
        </h3>
        <button
          onClick={() => setShowGoalForm(!showGoalForm)}
          className="text-blue-400 text-sm hover:text-blue-300"
        >
          {showGoalForm ? 'ยกเลิก' : '+ เพิ่มเป้าหมาย'}
        </button>
      </div>

      {/* Current Streak */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Flame className="w-6 h-6 text-white mr-3" />
            <div>
              <p className="text-white font-bold text-lg">{currentStreak} วัน</p>
              <p className="text-orange-100 text-xs">ความต่อเนื่อง</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-orange-100 text-xs">
              {currentStreak >= 7 ? '🔥 เก่งมาก!' : 
               currentStreak >= 3 ? '💪 ดีแล้ว!' : '🎯 เริ่มต้นใหม่!'}
            </p>
          </div>
        </div>
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <div className="space-y-3 mb-4">
          {goals.filter(goal => goal.isActive).map(goal => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      {/* Goal Form */}
      {showGoalForm && (
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          <input
            type="text"
            placeholder="ชื่อเป้าหมาย เช่น 'ออกกำลังกายสม่ำเสมอ'"
            value={newGoal.title}
            onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            value={newGoal.type}
            onChange={(e) => setNewGoal({...newGoal, type: e.target.value})}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(goalTypes).map(([key, type]) => (
              <option key={key} value={key}>{type.label}</option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              placeholder="เป้าหมาย"
              value={newGoal.target}
              onChange={(e) => setNewGoal({...newGoal, target: parseInt(e.target.value)})}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newGoal.period}
              onChange={(e) => setNewGoal({...newGoal, period: e.target.value})}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">สัปดาห์</option>
              <option value="month">เดือน</option>
            </select>
          </div>
          
          <button
            onClick={handleSubmitGoal}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            สร้างเป้าหมาย
          </button>
        </div>
      )}

      {goals.length === 0 && !showGoalForm && (
        <div className="text-center py-6 text-gray-500">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">ยังไม่มีเป้าหมาย</p>
          <p className="text-xs">กดเพิ่มเป้าหมายเพื่อเริ่มต้น</p>
        </div>
      )}
    </div>
  );
};

export default GoalTracker;
