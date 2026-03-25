
import React from 'react';
import { 
  CalculatorState, 
  CalculationResults,
  EstimateRecord,
} from '../types';
import { CalculatorHeader } from './calculator/CalculatorHeader';
import { CrewReportBanner } from './calculator/CrewReportBanner';
import { ResultsCard } from './calculator/ResultsCard';
import { DimensionsSection } from './calculator/DimensionsSection';
import { InsulationSpecsSection } from './calculator/InsulationSpecsSection';
import { InventorySection } from './calculator/InventorySection';
import { LaborSection } from './calculator/LaborSection';
import { ActionBar } from './calculator/ActionBar';

interface CalculatorProps {
  state: CalculatorState;
  results: CalculationResults;
  editingEstimateId: string | null;
  onInputChange: (field: keyof CalculatorState, value: any) => void;
  onSettingsChange: (category: 'wallSettings' | 'roofSettings', field: string, value: any) => void;
  onCustomerSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onInventoryUpdate: (id: string, field: string, value: any) => void;
  onAddInventory: () => void;
  onRemoveInventory: (id: string) => void;
  onSaveEstimate: (status?: EstimateRecord['status']) => void;
  onGeneratePDF: () => void;
  onStageWorkOrder: () => void;
  onStageInvoice: () => void;
  onStageEstimate: () => void;
  onAddNewCustomer: () => void;
  onMarkPaid?: (id: string) => void; 
  onCreateWarehouseItem?: (name: string, unit: string, cost: number) => void;
}

export const Calculator: React.FC<CalculatorProps> = ({
  state,
  results,
  editingEstimateId,
  onInputChange,
  onSettingsChange,
  onCustomerSelect,
  onInventoryUpdate,
  onAddInventory,
  onRemoveInventory,
  onSaveEstimate,
  onGeneratePDF,
  onStageWorkOrder,
  onStageInvoice,
  onStageEstimate,
  onAddNewCustomer,
  onMarkPaid,
  onCreateWarehouseItem
}) => {

  const currentRecord = editingEstimateId ? state.savedEstimates.find(e => e.id === editingEstimateId) : null;
  const currentStatus = currentRecord?.status || 'Draft';
  const isJobCompleted = currentRecord?.executionStatus === 'Completed';
  const activeScheduledDate = currentRecord?.scheduledDate || state.scheduledDate;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in duration-200 pb-24">
       
       <CalculatorHeader 
          state={state}
          editingEstimateId={editingEstimateId}
          currentStatus={currentStatus}
          activeScheduledDate={activeScheduledDate}
          onInputChange={onInputChange}
          onCustomerSelect={onCustomerSelect}
          onAddNewCustomer={onAddNewCustomer}
          onStageEstimate={onStageEstimate}
          onStageWorkOrder={onStageWorkOrder}
          onStageInvoice={onStageInvoice}
       />

       {isJobCompleted && currentRecord && currentStatus !== 'Paid' && (
          <CrewReportBanner 
            currentRecord={currentRecord}
            onStageInvoice={onStageInvoice}
          />
       )}

       <ResultsCard 
          results={results}
          pricingMode={state.pricingMode}
       />

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DimensionsSection 
              state={state}
              results={results}
              onInputChange={onInputChange}
            />

            <InsulationSpecsSection 
              state={state}
              results={results}
              onInputChange={onInputChange}
              onSettingsChange={onSettingsChange}
            />

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <InventorySection 
                  state={state}
                  onInventoryUpdate={onInventoryUpdate}
                  onAddInventory={onAddInventory}
                  onRemoveInventory={onRemoveInventory}
                  onCreateWarehouseItem={onCreateWarehouseItem}
                />

                <LaborSection 
                  state={state}
                  onInputChange={onInputChange}
                />
            </div>

            <ActionBar 
              currentStatus={currentStatus}
              activeScheduledDate={activeScheduledDate}
              onSaveEstimate={onSaveEstimate}
              onStageEstimate={onStageEstimate}
              onStageWorkOrder={onStageWorkOrder}
              onStageInvoice={onStageInvoice}
            />
       </div>
    </div>
  );
};
