
import React from 'react';
import { Calculator as CalculatorIcon, Calendar, ArrowRight, FileCheck, Plus } from 'lucide-react';
import { CalculatorState, CalculationMode } from '../../types';
import { JobProgress } from '../JobProgress';

interface CalculatorHeaderProps {
  state: CalculatorState;
  editingEstimateId: string | null;
  currentStatus: string;
  activeScheduledDate: string;
  onInputChange: (field: keyof CalculatorState, value: any) => void;
  onCustomerSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onAddNewCustomer: () => void;
  onStageEstimate: () => void;
  onStageWorkOrder: () => void;
  onStageInvoice: () => void;
}

export const CalculatorHeader: React.FC<CalculatorHeaderProps> = ({
  state,
  editingEstimateId,
  currentStatus,
  activeScheduledDate,
  onInputChange,
  onCustomerSelect,
  onAddNewCustomer,
  onStageEstimate,
  onStageWorkOrder,
  onStageInvoice,
}) => {
  const getNextStep = () => {
    if (currentStatus === 'Draft') return { label: 'Finalize & Send', icon: FileCheck, action: onStageEstimate, style: 'bg-brand text-white shadow-red-200' };
    if (currentStatus === 'Work Order' && !activeScheduledDate) return { label: 'Schedule Job', icon: Calendar, action: onStageWorkOrder, style: 'bg-amber-500 text-white shadow-amber-200' };
    if (currentStatus === 'Work Order' && activeScheduledDate) return { label: 'Generate Invoice', icon: FileCheck, action: onStageInvoice, style: 'bg-emerald-600 text-white shadow-emerald-200' };
    if (currentStatus === 'Invoiced') return { label: 'Record Payment', icon: FileCheck, action: onStageInvoice, style: 'bg-slate-900 text-white shadow-slate-200' };
    return null;
  };

  const nextStep = getNextStep();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <CalculatorIcon className="w-6 h-6 text-brand" />
            {editingEstimateId ? 'Job Manager' : 'New Estimate'}
          </h2>
          <p className="text-slate-500 font-medium text-sm">Follow the workflow to manage this job.</p>
        </div>
        <div className="text-right hidden md:block">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Current Status</span>
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest inline-block ${
            currentStatus === 'Draft' ? 'bg-slate-100 text-slate-500' :
            currentStatus === 'Work Order' ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-600'
          }`}>
            {currentStatus}
          </span>
        </div>
      </div>

      <div className="mb-8 md:px-8">
        <JobProgress status={currentStatus} scheduledDate={activeScheduledDate} />

        {nextStep && (
          <div className="mt-6 flex justify-center animate-in slide-in-from-top-2 duration-500">
            <button
              onClick={nextStep.action}
              className={`flex items-center gap-2 px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg transition-all transform hover:scale-105 active:scale-95 ${nextStep.style} hover:opacity-90`}
            >
              {nextStep.label} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 border-t border-slate-100 pt-6">
        <div className="flex-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Customer / Lead</label>
          <div className="flex gap-2">
            <select
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-brand"
              value={state.customerProfile.id || 'new'}
              onChange={onCustomerSelect}
            >
              <option value="new">+ Create New Customer</option>
              {state.customers.filter(c => c.status !== 'Archived').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {(!state.customerProfile.id || state.customerProfile.id === 'new') && (
              <button onClick={onAddNewCustomer} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Calculation Mode</label>
          <select
            value={state.mode}
            onChange={(e) => onInputChange('mode', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-brand"
          >
            <option value={CalculationMode.BUILDING}>Full Building (Walls + Roof)</option>
            <option value={CalculationMode.WALLS_ONLY}>Walls Only (Linear Ft)</option>
            <option value={CalculationMode.FLAT_AREA}>Flat Area (Attic/Slab)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
