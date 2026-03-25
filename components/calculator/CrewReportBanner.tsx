
import React from 'react';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { EstimateRecord } from '../../types';

interface CrewReportBannerProps {
  currentRecord: EstimateRecord;
  onStageInvoice: () => void;
}

export const CrewReportBanner: React.FC<CrewReportBannerProps> = ({ currentRecord, onStageInvoice }) => {
  return (
    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl animate-in slide-in-from-top-4">
      <div className="flex items-start gap-4">
        <div className="bg-white p-3 rounded-full shadow-sm text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-emerald-900 font-black uppercase text-sm tracking-widest mb-1">Job Completed by Crew</h3>
          <p className="text-emerald-700 text-sm font-medium mb-4">
            The crew has finalized this work order. Review actual usage before generating the invoice.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white/60 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Actual Labor</span>
              <div className="text-xl font-black text-emerald-900">{currentRecord.actuals?.laborHours || 0} hrs</div>
            </div>
            <div className="bg-white/60 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Open Cell Used</span>
              <div className="text-xl font-black text-emerald-900">{currentRecord.actuals?.openCellSets.toFixed(2) || 0} Sets</div>
            </div>
            <div className="bg-white/60 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Closed Cell Used</span>
              <div className="text-xl font-black text-emerald-900">{currentRecord.actuals?.closedCellSets.toFixed(2) || 0} Sets</div>
            </div>
          </div>

          <button
            onClick={onStageInvoice}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2"
          >
            <ClipboardList className="w-4 h-4" /> Review Actuals & Create Invoice
          </button>
        </div>
      </div>
    </div>
  );
};
