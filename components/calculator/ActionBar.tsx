
import React from 'react';
import { Save, FileCheck, CheckCircle2, Receipt, Calendar, Pencil, ClipboardList, HardHat, ArrowRight } from 'lucide-react';

interface ActionBarProps {
  currentStatus: string;
  activeScheduledDate: string;
  onSaveEstimate: () => void;
  onStageEstimate: () => void;
  onStageWorkOrder: () => void;
  onStageInvoice: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  currentStatus,
  activeScheduledDate,
  onSaveEstimate,
  onStageEstimate,
  onStageWorkOrder,
  onStageInvoice,
}) => {
  return (
    <div className="md:col-span-2 flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-200 pb-12">
      <button onClick={() => onSaveEstimate()} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
        <Save className="w-4 h-4" /> Save / Update
      </button>

      {currentStatus === 'Draft' && (
        <button
          onClick={onStageEstimate}
          className="flex-1 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
        >
          <FileCheck className="w-4 h-4" /> Review & Finalize Estimate
        </button>
      )}

      {currentStatus === 'Paid' ? (
        <div className="flex-1 bg-emerald-100 text-emerald-700 p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4" /> Paid in Full
        </div>
      ) : currentStatus === 'Invoiced' ? (
        <button
          onClick={onStageInvoice}
          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-sky-200"
        >
          <Receipt className="w-4 h-4" /> View / Manage Invoice
        </button>
      ) : currentStatus === 'Work Order' ? (
        <div className="flex-1 flex gap-2">
          {!activeScheduledDate ? (
            <button onClick={onStageWorkOrder} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-200">
              <Calendar className="w-4 h-4" /> Schedule Job
            </button>
          ) : (
            <button onClick={onStageWorkOrder} className="flex-1 bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-500 p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
              <Pencil className="w-4 h-4" /> Edit Work Order
            </button>
          )}

          <button onClick={onStageInvoice} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
            <ClipboardList className="w-4 h-4" /> Finalize & Invoice
          </button>
        </div>
      ) : (
        <button onClick={onStageWorkOrder} className="flex-1 bg-brand hover:bg-brand-hover text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-200">
          <HardHat className="w-4 h-4" /> Sold / Work Order <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
