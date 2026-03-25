
import React from 'react';
import { DollarSign } from 'lucide-react';
import { CalculatorState } from '../../types';

interface LaborSectionProps {
  state: CalculatorState;
  onInputChange: (field: keyof CalculatorState, value: any) => void;
}

export const LaborSection: React.FC<LaborSectionProps> = ({ state, onInputChange }) => {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 md:col-span-2">
      <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2 uppercase text-sm tracking-widest">
        <DollarSign className="w-5 h-5 text-brand" /> Labor & Fees
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Est. Man Hours</label>
          <input
            type="number"
            value={state.expenses.manHours}
            onChange={(e) => onInputChange('expenses', { ...state.expenses, manHours: parseFloat(e.target.value) })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-brand outline-none"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Trip / Fuel ($)</label>
          <input
            type="number"
            value={state.expenses.tripCharge}
            onChange={(e) => onInputChange('expenses', { ...state.expenses, tripCharge: parseFloat(e.target.value) })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-brand outline-none"
          />
        </div>
      </div>
    </div>
  );
};
