
import React from 'react';
import { CalculationResults, CalculatorState } from '../../types';

interface ResultsCardProps {
  results: CalculationResults;
  pricingMode: CalculatorState['pricingMode'];
}

export const ResultsCard: React.FC<ResultsCardProps> = ({ results, pricingMode }) => {
  return (
    <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Spray Area</div>
          <div className="text-3xl font-black">
            {Math.round(results.totalWallArea + results.totalRoofArea).toLocaleString()} <span className="text-sm text-slate-500 font-bold">sqft</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Volume</div>
          <div className="text-3xl font-black">
            {Math.round(results.wallBdFt + results.roofBdFt).toLocaleString()} <span className="text-sm text-slate-500 font-bold">bdft</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Chemical Sets</div>
          <div className="text-lg font-bold">
            {results.openCellSets > 0 && (
              <div className="text-brand-yellow">
                {results.openCellSets.toFixed(2)} OC
                <div className="text-[10px] text-slate-400 font-normal">~{results.openCellStrokes.toLocaleString()} Strokes</div>
              </div>
            )}
            {results.closedCellSets > 0 && (
              <div className={`text-white ${results.openCellSets > 0 ? 'mt-1' : ''}`}>
                {results.closedCellSets.toFixed(2)} CC
                <div className="text-[10px] text-slate-400 font-normal">~{results.closedCellStrokes.toLocaleString()} Strokes</div>
              </div>
            )}
            {results.openCellSets === 0 && results.closedCellSets === 0 && <span className="text-slate-600">-</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            {pricingMode === 'sqft_pricing' ? 'SqFt Quote Total' : 'Total Estimate'}
          </div>
          <div className="text-3xl font-black text-brand">${Math.round(results.totalCost).toLocaleString()}</div>
          {pricingMode === 'sqft_pricing' && (
            <div className="text-[9px] text-slate-500 mt-1 uppercase tracking-wide">
              Overrides Material+Labor
            </div>
          )}
        </div>
      </div>

      {/* COST BREAKDOWN SECTION */}
      <div className="pt-6 border-t border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">COGS: Material</div>
          <div className="text-lg font-bold text-slate-300">
            ${Math.round(results.materialCost).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">COGS: Labor & Misc</div>
          <div className="text-lg font-bold text-slate-300">
            ${Math.round(results.laborCost + results.miscExpenses).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Projected Margin</div>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            {results.totalCost > 0 ? (
              <>
                ${Math.round(results.totalCost - (results.materialCost + results.laborCost + results.miscExpenses)).toLocaleString()}
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${
                  (results.totalCost - (results.materialCost + results.laborCost + results.miscExpenses)) / results.totalCost > 0.3
                    ? 'bg-emerald-900/50 text-emerald-400'
                    : 'bg-red-900/50 text-red-400'
                }`}>
                  {((1 - (results.materialCost + results.laborCost + results.miscExpenses) / results.totalCost) * 100).toFixed(1)}%
                </span>
              </>
            ) : '-'}
          </div>
        </div>
      </div>
    </div>
  );
};
