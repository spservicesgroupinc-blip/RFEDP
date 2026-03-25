
import React from 'react';
import { Building2, Plus, Trash2, ArrowRight } from 'lucide-react';
import { CalculatorState, CalculationMode, AreaType, AdditionalArea, CalculationResults } from '../../types';

interface DimensionsSectionProps {
  state: CalculatorState;
  results: CalculationResults;
  onInputChange: (field: keyof CalculatorState, value: any) => void;
}

export const DimensionsSection: React.FC<DimensionsSectionProps> = ({ state, results, onInputChange }) => {
  const addArea = () => {
    const newArea: AdditionalArea = { type: AreaType.WALL, length: 0, width: 0 };
    const currentAreas = state.additionalAreas || [];
    onInputChange('additionalAreas', [...currentAreas, newArea]);
  };

  const removeArea = (index: number) => {
    const updated = state.additionalAreas.filter((_, i) => i !== index);
    onInputChange('additionalAreas', updated);
  };

  const updateArea = (index: number, field: keyof AdditionalArea, value: any) => {
    const updated = state.additionalAreas.map((area, i) =>
      i === index ? { ...area, [field]: value } : area
    );
    onInputChange('additionalAreas', updated);
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2 uppercase text-sm tracking-widest">
        <Building2 className="w-5 h-5 text-brand" /> Building Dimensions
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {state.mode !== CalculationMode.FLAT_AREA && (
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Length (ft)</label>
            <input
              type="number"
              value={state.length}
              onChange={(e) => onInputChange('length', parseFloat(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-brand outline-none"
            />
          </div>
        )}
        {state.mode === CalculationMode.BUILDING && (
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Width (ft)</label>
            <input
              type="number"
              value={state.width}
              onChange={(e) => onInputChange('width', parseFloat(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-brand outline-none"
            />
          </div>
        )}
        {state.mode !== CalculationMode.FLAT_AREA && (
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Wall Height (ft)</label>
            <input
              type="number"
              value={state.wallHeight}
              onChange={(e) => onInputChange('wallHeight', parseFloat(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-brand outline-none"
            />
          </div>
        )}
        {state.mode === CalculationMode.BUILDING && (
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Roof Pitch (X/12)</label>
            <input
              type="text"
              value={state.roofPitch}
              onChange={(e) => onInputChange('roofPitch', e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-brand outline-none"
            />
          </div>
        )}
        {state.mode === CalculationMode.FLAT_AREA && (
          <>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Length (ft)</label>
              <input
                type="number"
                value={state.length}
                onChange={(e) => onInputChange('length', parseFloat(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-brand outline-none"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Width (ft)</label>
              <input
                type="number"
                value={state.width}
                onChange={(e) => onInputChange('width', parseFloat(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-brand outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Pitch / Slope (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 4/12 or 0"
                value={state.roofPitch}
                onChange={(e) => onInputChange('roofPitch', e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-brand outline-none"
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-4">
        {state.mode === CalculationMode.BUILDING && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="gables"
              checked={state.includeGables}
              onChange={(e) => onInputChange('includeGables', e.target.checked)}
              className="w-5 h-5 text-brand rounded focus:ring-brand border-slate-300"
            />
            <label htmlFor="gables" className="text-sm font-bold text-slate-700">Include Gable Ends?</label>
          </div>
        )}

        {/* Metal Surface Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="metalSurface"
            checked={state.isMetalSurface || false}
            onChange={(e) => onInputChange('isMetalSurface', e.target.checked)}
            className="w-5 h-5 text-brand rounded focus:ring-brand border-slate-300"
          />
          <label htmlFor="metalSurface" className="text-sm font-bold text-slate-700 flex items-center gap-1">
            Metal Surface?
            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">+15% Area</span>
          </label>
        </div>
      </div>

      {/* LIVE GABLE AREA DISPLAY */}
      {state.mode === CalculationMode.BUILDING && state.includeGables && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] font-black text-sky-600 bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-lg flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> {Math.round(results.gableArea).toLocaleString()} sqft (Gables)
          </span>
        </div>
      )}

      {/* ADDITIONAL AREAS */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Section
          </label>
          <button onClick={addArea} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded-lg transition-colors">
            + Add
          </button>
        </div>

        <div className="space-y-2">
          {state.additionalAreas && state.additionalAreas.map((area, index) => (
            <div key={index} className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              <select
                value={area.type}
                onChange={(e) => updateArea(index, 'type', e.target.value as AreaType)}
                className="bg-white border border-slate-200 text-[10px] font-bold rounded-lg p-1.5 outline-none focus:border-brand w-20"
              >
                <option value={AreaType.WALL}>Wall</option>
                <option value={AreaType.ROOF}>Roof</option>
              </select>

              <div className="flex-1 flex items-center gap-1">
                <input
                  type="number"
                  placeholder="L"
                  value={area.length || ''}
                  onChange={(e) => updateArea(index, 'length', parseFloat(e.target.value))}
                  className="w-full bg-white border border-slate-200 text-[10px] font-bold rounded-lg p-1.5 outline-none focus:border-brand"
                />
                <span className="text-slate-300 font-black text-[10px]">x</span>
                <input
                  type="number"
                  placeholder="W"
                  value={area.width || ''}
                  onChange={(e) => updateArea(index, 'width', parseFloat(e.target.value))}
                  className="w-full bg-white border border-slate-200 text-[10px] font-bold rounded-lg p-1.5 outline-none focus:border-brand"
                />
              </div>

              <div className="text-[10px] font-black text-slate-400 w-16 text-right">
                {Math.round((area.length || 0) * (area.width || 0))} sqft
              </div>

              <button onClick={() => removeArea(index)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {(!state.additionalAreas || state.additionalAreas.length === 0) && (
            <div className="text-center py-2 text-[10px] text-slate-300 italic border border-dashed border-slate-100 rounded-lg">
              No extra sections added.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
