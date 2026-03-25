
import React from 'react';
import { HardHat } from 'lucide-react';
import { CalculatorState, CalculationMode, FoamType, CalculationResults } from '../../types';

interface InsulationSpecsSectionProps {
  state: CalculatorState;
  results: CalculationResults;
  onInputChange: (field: keyof CalculatorState, value: any) => void;
  onSettingsChange: (category: 'wallSettings' | 'roofSettings', field: string, value: any) => void;
}

export const InsulationSpecsSection: React.FC<InsulationSpecsSectionProps> = ({
  state,
  results,
  onInputChange,
  onSettingsChange,
}) => {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-widest">
          <HardHat className="w-5 h-5 text-brand" /> Insulation Specs
        </h3>

        {/* PRICING MODE TOGGLE */}
        <div className="bg-slate-100 p-1 rounded-lg flex items-center">
          <button
            onClick={() => onInputChange('pricingMode', 'level_pricing')}
            className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
              state.pricingMode === 'level_pricing' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Cost Plus
          </button>
          <button
            onClick={() => onInputChange('pricingMode', 'sqft_pricing')}
            className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
              state.pricingMode === 'sqft_pricing' ? 'bg-white shadow-sm text-brand' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            SqFt Price
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {state.mode !== CalculationMode.FLAT_AREA && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Walls</span>
              {/* LIVE WALL AREA DISPLAY */}
              <span className="text-xs font-black text-sky-600 bg-white border border-sky-100 px-2 py-1 rounded shadow-sm">
                Total: {Math.round(results.totalWallArea).toLocaleString()} sqft
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={state.wallSettings.type}
                onChange={(e) => onSettingsChange('wallSettings', 'type', e.target.value)}
                className="col-span-2 bg-white border border-slate-200 p-2 rounded-lg font-bold text-sm"
              >
                <option value={FoamType.OPEN_CELL}>Open Cell</option>
                <option value={FoamType.CLOSED_CELL}>Closed Cell</option>
              </select>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Depth (in)</label>
                <input
                  type="number"
                  value={state.wallSettings.thickness}
                  onChange={(e) => onSettingsChange('wallSettings', 'thickness', parseFloat(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-sm"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Waste %</label>
                <input
                  type="number"
                  value={state.wallSettings.wastePercentage}
                  onChange={(e) => onSettingsChange('wallSettings', 'wastePercentage', parseFloat(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-sm"
                />
              </div>
              {/* SQFT PRICING INPUT */}
              {state.pricingMode === 'sqft_pricing' && (
                <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                  <label className="text-[9px] font-black text-brand uppercase block mb-1">Price Per Sq Ft ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      value={state.sqFtRates.wall}
                      onChange={(e) => onInputChange('sqFtRates', { ...state.sqFtRates, wall: parseFloat(e.target.value) })}
                      className="w-full pl-6 p-2 bg-white border border-brand/20 rounded-lg font-bold text-sm focus:ring-1 focus:ring-brand outline-none text-brand"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Roof / Ceiling</span>
            {/* LIVE ROOF AREA DISPLAY */}
            <span className="text-xs font-black text-sky-600 bg-white border border-sky-100 px-2 py-1 rounded shadow-sm">
              Total: {Math.round(results.totalRoofArea).toLocaleString()} sqft
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={state.roofSettings.type}
              onChange={(e) => onSettingsChange('roofSettings', 'type', e.target.value)}
              className="col-span-2 bg-white border border-slate-200 p-2 rounded-lg font-bold text-sm"
            >
              <option value={FoamType.OPEN_CELL}>Open Cell</option>
              <option value={FoamType.CLOSED_CELL}>Closed Cell</option>
            </select>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Depth (in)</label>
              <input
                type="number"
                value={state.roofSettings.thickness}
                onChange={(e) => onSettingsChange('roofSettings', 'thickness', parseFloat(e.target.value))}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-sm"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Waste %</label>
              <input
                type="number"
                value={state.roofSettings.wastePercentage}
                onChange={(e) => onSettingsChange('roofSettings', 'wastePercentage', parseFloat(e.target.value))}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-sm"
              />
            </div>
            {/* SQFT PRICING INPUT */}
            {state.pricingMode === 'sqft_pricing' && (
              <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                <label className="text-[9px] font-black text-brand uppercase block mb-1">Price Per Sq Ft ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    value={state.sqFtRates.roof}
                    onChange={(e) => onInputChange('sqFtRates', { ...state.sqFtRates, roof: parseFloat(e.target.value) })}
                    className="w-full pl-6 p-2 bg-white border border-brand/20 rounded-lg font-bold text-sm focus:ring-1 focus:ring-brand outline-none text-brand"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
