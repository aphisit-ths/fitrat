import React from 'react';
import { TrendingDown } from 'lucide-react';

const TodayStats = ({ currentData }) => {
  return (
    <div className="bg-black rounded-2xl p-4 shadow-xl border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
          <TrendingDown className="w-5 h-5 text-white" />
        </div>
        <span className="text-xs text-orange-400 font-medium">เป้าหมาย 15 กก.</span>
      </div>
      <h3 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
        {currentData.totalLoss.toFixed(1)} กก.
      </h3>
      <p className="text-xs text-gray-400">ลดไปแล้ว</p>
      
      {/* Mini progress bar */}
      <div className="mt-3">
        <div className="w-full bg-gray-800 rounded-full h-1.5">
          <div 
            className="bg-gradient-to-r from-orange-500 to-red-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((currentData.totalLoss / 15) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>0 กก.</span>
          <span>15 กก.</span>
        </div>
      </div>
    </div>
  );
};

export default TodayStats;
