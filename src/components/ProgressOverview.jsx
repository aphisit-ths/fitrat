import React from 'react';
import { TrendingDown, Scale, Target } from 'lucide-react';

const ProgressOverview = ({ currentData }) => {
  return (
    <div className="bg-black rounded-2xl p-4 shadow-xl border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">ความคืบหน้า</h2>
            <p className="text-sm text-gray-400">ลดไปแล้ว {currentData.totalLoss.toFixed(1)} กก.</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {Math.round(currentData.progressPercent)}%
          </div>
          <div className="text-xs text-gray-500">ความสำเร็จ</div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(currentData.progressPercent, 100)}%` }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <p className="text-lg font-bold text-white">{currentData.startWeight}</p>
          <p className="text-xs text-gray-500">เริ่มต้น</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-blue-500/30">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <p className="text-lg font-bold text-blue-300">{currentData.currentWeight}</p>
          <p className="text-xs text-gray-500">ปัจจุบัน</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-green-500/30">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Target className="w-4 h-4 text-white" />
          </div>
          <p className="text-lg font-bold text-green-300">{currentData.targetWeight}</p>
          <p className="text-xs text-gray-500">เป้าหมาย</p>
        </div>
      </div>
    </div>
  );
};

export default ProgressOverview;
