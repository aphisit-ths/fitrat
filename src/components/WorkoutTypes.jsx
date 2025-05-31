import React from 'react';
import { Activity, Heart, Dumbbell, Waves, Users, MapPin } from 'lucide-react';

const WorkoutTypes = ({ selectedType, onTypeChange, showLabel = true }) => {
  const workoutTypes = {
    cardio: { 
      label: 'Cardio', 
      icon: Heart, 
      color: 'text-red-400',
      bgColor: 'bg-red-500/10 border-red-500/20',
      examples: 'วิ่ง, ปั่นจักรยาน, แอโรบิค'
    },
    strength: { 
      label: 'Strength', 
      icon: Dumbbell, 
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      examples: 'ยิม, ฟิตเนส, ยกน้ำหนัก'
    },
    flexibility: { 
      label: 'Flexibility', 
      icon: Waves, 
      color: 'text-green-400',
      bgColor: 'bg-green-500/10 border-green-500/20',
      examples: 'โยคะ, สเตรตช์, พิลาทิส'
    },
    sports: { 
      label: 'Sports', 
      icon: Users, 
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      examples: 'ฟุตบอล, แบด, บาส'
    },
    outdoor: { 
      label: 'Outdoor', 
      icon: MapPin, 
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10 border-orange-500/20',
      examples: 'เดินป่า, ปีนเขา, ว่ายน้ำ'
    },
    general: { 
      label: 'General', 
      icon: Activity, 
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10 border-gray-500/20',
      examples: 'ทั่วไป'
    }
  };

  return (
    <div className="space-y-3">
      {showLabel && (
        <label className="block text-sm font-medium text-gray-300">ประเภทการออกกำลังกาย</label>
      )}
      
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(workoutTypes).map(([key, type]) => {
          const Icon = type.icon;
          const isSelected = selectedType === key;
          
          return (
            <button
              key={key}
              onClick={() => onTypeChange(key)}
              className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                isSelected 
                  ? `${type.bgColor} ${type.color} border-current`
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="font-medium text-sm">{type.label}</span>
              </div>
              <p className="text-xs opacity-75">{type.examples}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WorkoutTypes;
