import React from 'react';
import { Calendar, Target, Activity } from 'lucide-react';

const HeatmapCalendar = ({ workoutData }) => {
  const getDateString = (date = new Date()) => {
    return date.toISOString().split('T')[0];
  };

  const getDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

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

  const getIntensityColor = (intensity) => {
    const colors = [
      'bg-gray-800', // 0 - ไม่ได้ออกกำลังกาย
      'bg-gray-600', // 1 - น้อย
      'bg-gray-500', // 2 - ปานกลาง  
      'bg-gray-400', // 3 - มาก
      'bg-gray-300'  // 4 - มากที่สุด
    ];
    return colors[intensity] || colors[0];
  };

  const getWeeksData = () => {
    const heatmapData = generateHeatmapData();
    const weeks = [];
    let currentWeek = [];
    
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
    
    while (currentWeek.length < 7 && currentWeek.length > 0) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const heatmapData = generateHeatmapData();
  const weeks = getWeeksData();
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div className="bg-black rounded-2xl p-4 shadow-xl border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">ประวัติการออกกำลังกาย</h3>
        <span className="text-xs text-gray-400">90 วันย้อนหลัง</span>
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
          <div className="flex flex-col gap-1 mr-2">
            <div className="h-3"></div>
            {dayNames.map((day, index) => (
              <div key={index} className="h-3 text-xs text-gray-600 flex items-center">
                {index % 2 === 1 ? day : ''}
              </div>
            ))}
          </div>
          
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              <div className="h-3 text-xs text-gray-600">
                {week[0] && new Date(week[0].date).getDate() <= 7 
                  ? monthNames[new Date(week[0].date).getMonth()] 
                  : ''
                }
              </div>
              
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

      {/* Stats with colored icons */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-900/50 rounded-lg p-3 border border-blue-500/20">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Calendar className="w-3 h-3 text-white" />
          </div>
          <p className="font-bold text-blue-300">
            {heatmapData.filter(d => d.intensity > 0).length}
          </p>
          <p className="text-xs text-gray-500">วันที่ออกกำลังกาย</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-green-500/20">
          <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Target className="w-3 h-3 text-white" />
          </div>
          <p className="font-bold text-green-300">
            {Math.round((heatmapData.filter(d => d.intensity > 0).length / 90) * 100)}%
          </p>
          <p className="text-xs text-gray-500">อัตราความสม่ำเสมอ</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-purple-500/20">
          <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Activity className="w-3 h-3 text-white" />
          </div>
          <p className="font-bold text-purple-300">
            {Math.max(...heatmapData.slice(-7).map(d => d.intensity))}
          </p>
          <p className="text-xs text-gray-500">ความเข้มข้นสูงสุด (7 วัน)</p>
        </div>
      </div>
    </div>
  );
};

export default HeatmapCalendar;
