import React, { useState } from 'react';
import { Scale } from 'lucide-react';

const WeightInput = ({ 
  weightHistory, 
  setCurrentWeight, 
  setWeightHistory, 
  saveToStorage, 
  isOnline, 
  weightService, 
  profileService, 
  setSyncStatus, 
  addToPendingSync 
}) => {
  const [inputWeight, setInputWeight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDateString = (date = new Date()) => {
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (inputWeight && !isNaN(inputWeight) && parseFloat(inputWeight) > 0) {
      const newWeight = parseFloat(inputWeight);
      const today = getDateString();
      
      setIsSubmitting(true);
      try {
        setCurrentWeight(newWeight);
        const newHistory = [...weightHistory.filter(entry => entry.date !== today), { date: today, weight: newWeight }];
        setWeightHistory(newHistory);
        
        saveToStorage('currentWeight', newWeight);
        saveToStorage('weightHistory', newHistory);
        
        if (isOnline) {
          try {
            await weightService.addWeightEntry(today, newWeight);
            await profileService.updateProfile({ current_weight: newWeight });
            setSyncStatus('synced');
          } catch (error) {
            addToPendingSync({ type: 'weight', date: today, weight: newWeight });
            setSyncStatus('error');
          }
        } else {
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
    <div className="bg-black rounded-2xl p-4 shadow-xl border border-gray-800">
      <h3 className="font-semibold text-white mb-3 flex items-center">
        <Scale className="w-4 h-4 mr-2 text-blue-400" />
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
          className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-center text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? '...' : 'บันทึก'}
        </button>
      </div>
    </div>
  );
};

export default WeightInput;
