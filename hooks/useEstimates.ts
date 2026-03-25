
import React from 'react';
import { useCalculator, DEFAULT_STATE } from '../context/CalculatorContext';
import { EstimateRecord, CalculationResults, CustomerProfile, PurchaseOrder, InvoiceLineItem } from '../types';
import { deleteEstimate, markJobPaid, createWorkOrderSheet, syncUp } from '../services/api';
import { generateWorkOrderPDF, generateDocumentPDF } from '../utils/pdfGenerator';

export const useEstimates = () => {
  const { state, dispatch } = useCalculator();
  const { appData, ui, session } = state;
  
  // Use a ref to always have access to the latest state in async closures
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadEstimateForEditing = (record: EstimateRecord) => {
    dispatch({
        type: 'UPDATE_DATA',
        payload: {
            mode: record.inputs.mode,
            length: record.inputs.length,
            width: record.inputs.width,
            wallHeight: record.inputs.wallHeight,
            roofPitch: record.inputs.roofPitch,
            includeGables: record.inputs.includeGables,
            isMetalSurface: record.inputs.isMetalSurface || false,
            additionalAreas: record.inputs.additionalAreas || [],
            wallSettings: record.wallSettings,
            roofSettings: record.roofSettings,
            expenses: { ...record.expenses, laborRate: record.expenses?.laborRate ?? appData.costs.laborRate },
            inventory: record.materials.inventory,
            customerProfile: record.customer,
            jobNotes: record.notes || '',
            scheduledDate: record.scheduledDate || '',
            invoiceDate: record.invoiceDate || '',
            invoiceNumber: record.invoiceNumber || '',
            paymentTerms: record.paymentTerms || 'Due on Receipt',
            pricingMode: record.pricingMode || 'level_pricing',
            sqFtRates: record.sqFtRates || { wall: 0, roof: 0 }
        }
    });
    dispatch({ type: 'SET_EDITING_ESTIMATE', payload: record.id });
    dispatch({ type: 'SET_VIEW', payload: 'estimate_detail' }); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveEstimate = async (results: CalculationResults, targetStatus?: EstimateRecord['status'], extraData?: Partial<EstimateRecord>, shouldRedirect: boolean = true, overrideWarehouse?: any) => {
    if (!appData.customerProfile.name) { 
        dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Customer Name Required to Save' } });
        return null; 
    }

    const estimateId = ui.editingEstimateId || Math.random().toString(36).substr(2, 9);
    const existingRecord = appData.savedEstimates.find(e => e.id === estimateId);
    
    // Ensure customer ID is consistent
    const customerId = appData.customerProfile.id || Math.random().toString(36).substr(2, 9);
    
    let newStatus: EstimateRecord['status'] = targetStatus || (existingRecord?.status || 'Draft');
    
    let invoiceNumber = appData.invoiceNumber;
    if (!invoiceNumber) {
        invoiceNumber = existingRecord?.invoiceNumber;
        if (newStatus === 'Invoiced' && !invoiceNumber) invoiceNumber = `INV-${Math.floor(Math.random() * 100000)}`;
    }

    // Calculate inventory delta
    const oldInventory = existingRecord?.materials?.inventory || [];
    const newInventory = appData.inventory || [];

    const inventoryDelta = newInventory.reduce((acc, item) => {
        const key = item.warehouseItemId || item.name;
        if (key) {
            acc[key] = (acc[key] || 0) + (Number(item.quantity) || 0);
        }
        return acc;
    }, {} as Record<string, number>);

    oldInventory.forEach(item => {
        const key = item.warehouseItemId || item.name;
        if (key) {
            inventoryDelta[key] = (inventoryDelta[key] || 0) - (Number(item.quantity) || 0);
        }
    });

    let newWarehouse = overrideWarehouse ? { ...overrideWarehouse } : { ...appData.warehouse };
    let warehouseChanged = !!overrideWarehouse;

    newWarehouse.items = newWarehouse.items.map((item: any) => {
        const delta = inventoryDelta[item.id] || inventoryDelta[item.name];
        if (delta) {
            warehouseChanged = true;
            return { ...item, quantity: item.quantity - delta };
        }
        return item;
    });

    const newEstimate: EstimateRecord = {
      id: estimateId,
      customerId: customerId,
      date: existingRecord?.date || new Date().toISOString(),
      scheduledDate: appData.scheduledDate,
      invoiceDate: appData.invoiceDate,
      paymentTerms: appData.paymentTerms,
      status: newStatus,
      invoiceNumber: invoiceNumber,
      customer: { ...appData.customerProfile },
      inputs: {
          mode: appData.mode, length: appData.length, width: appData.width, wallHeight: appData.wallHeight,
          roofPitch: appData.roofPitch, includeGables: appData.includeGables, 
          isMetalSurface: appData.isMetalSurface, 
          additionalAreas: appData.additionalAreas
      },
      results: { ...results },
      materials: { openCellSets: results.openCellSets, closedCellSets: results.closedCellSets, inventory: [...appData.inventory] },
      totalValue: results.totalCost, 
      wallSettings: { ...appData.wallSettings },
      roofSettings: { ...appData.roofSettings },
      expenses: { ...appData.expenses },
      notes: appData.jobNotes,
      pricingMode: appData.pricingMode,
      sqFtRates: appData.sqFtRates,
      executionStatus: existingRecord?.executionStatus || 'Not Started',
      actuals: existingRecord?.actuals,
      financials: existingRecord?.financials,
      workOrderSheetUrl: existingRecord?.workOrderSheetUrl,
      
      // Preserve custom lines if not provided in extraData
      invoiceLines: extraData?.invoiceLines || existingRecord?.invoiceLines,
      workOrderLines: extraData?.workOrderLines || existingRecord?.workOrderLines,
      estimateLines: extraData?.estimateLines || existingRecord?.estimateLines,

      ...extraData 
    };

    let updatedEstimates = [...appData.savedEstimates];
    const idx = updatedEstimates.findIndex(e => e.id === estimateId);
    if (idx >= 0) updatedEstimates[idx] = newEstimate;
    else updatedEstimates.unshift(newEstimate);

    const updatePayload: any = { savedEstimates: updatedEstimates };
    if (warehouseChanged) {
        updatePayload.warehouse = newWarehouse;
    }

    dispatch({ type: 'UPDATE_DATA', payload: updatePayload });
    dispatch({ type: 'SET_EDITING_ESTIMATE', payload: estimateId });
    
    // Check for implicit customer creation
    if (!appData.customers.find(c => c.id === customerId)) {
        const newCustomer = { ...appData.customerProfile, id: customerId };
        saveCustomer(newCustomer);
    }

    // Redirect control
    if (shouldRedirect) {
        dispatch({ type: 'SET_VIEW', payload: 'estimate_detail' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const actionLabel = targetStatus === 'Work Order' ? 'Job Sold! Moved to Work Order' : 
                        targetStatus === 'Invoiced' ? 'Invoice Generated' : 
                        targetStatus === 'Paid' ? 'Payment Recorded' : 'Estimate Saved';
    dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: actionLabel } });

    return newEstimate;
  };

  const handleDeleteEstimate = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to delete this job?")) {
      const estimateToDelete = appData.savedEstimates.find(est => est.id === id);
      
      let newWarehouse = { ...appData.warehouse };
      let warehouseChanged = false;
      
      if (estimateToDelete && estimateToDelete.materials?.inventory?.length > 0) {
          const inventoryToRestore = estimateToDelete.materials.inventory.reduce((acc, item) => {
              const key = item.warehouseItemId || item.name;
              if (key) {
                  acc[key] = (acc[key] || 0) + (Number(item.quantity) || 0);
              }
              return acc;
          }, {} as Record<string, number>);
          
          newWarehouse.items = newWarehouse.items.map((item: any) => {
              const restoreQty = inventoryToRestore[item.id] || inventoryToRestore[item.name];
              if (restoreQty) {
                  warehouseChanged = true;
                  return { ...item, quantity: item.quantity + restoreQty };
              }
              return item;
          });
      }

      const updatePayload: any = { savedEstimates: appData.savedEstimates.filter(est => est.id !== id) };
      if (warehouseChanged) {
          updatePayload.warehouse = newWarehouse;
      }

      dispatch({ type: 'UPDATE_DATA', payload: updatePayload });

      if (ui.editingEstimateId === id) { 
          dispatch({ type: 'SET_EDITING_ESTIMATE', payload: null }); 
          dispatch({ type: 'SET_VIEW', payload: 'dashboard' }); 
      }
      if (session?.spreadsheetId) {
          try {
              await deleteEstimate(id, session.spreadsheetId);
              dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Job Deleted' } });
          } catch (err) {
              dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Local delete success, but server failed.' } });
          }
      }
    }
  };

  const handleMarkPaid = async (id: string) => {
      const estimate = appData.savedEstimates.find(e => e.id === id);
      if (estimate) {
         dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Processing Payment & P&L...' } });
         dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
         const result = await markJobPaid(id, session?.spreadsheetId || '');
         if (result.success && result.estimate) {
             const updatedEstimates = appData.savedEstimates.map(e => e.id === id ? result.estimate! : e);
             dispatch({ type: 'UPDATE_DATA', payload: { savedEstimates: updatedEstimates } });
             dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Paid! Profit Calculated.' } });
             generateDocumentPDF(appData, estimate.results, 'RECEIPT', result.estimate);
         } else {
             dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Failed to update P&L.' } });
         }
         dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
      }
  };

  const saveCustomer = (customerData: CustomerProfile) => {
    let updatedCustomers = [...appData.customers];
    const existingIndex = updatedCustomers.findIndex(c => c.id === customerData.id);
    if (existingIndex >= 0) updatedCustomers[existingIndex] = customerData;
    else updatedCustomers.push(customerData);
    
    if (appData.customerProfile.id === customerData.id) {
        dispatch({ type: 'UPDATE_DATA', payload: { customers: updatedCustomers, customerProfile: customerData } });
    } else {
        dispatch({ type: 'UPDATE_DATA', payload: { customers: updatedCustomers } });
    }
  };

  const confirmWorkOrder = async (results: CalculationResults, workOrderLines?: InvoiceLineItem[]) => {
    // 1. Deduct Foam Sets (Allow negatives - No checks/warnings/blocks)
    const requiredOpen = Number(results.openCellSets) || 0;
    const requiredClosed = Number(results.closedCellSets) || 0;
    
    const newWarehouse = { ...appData.warehouse };
    newWarehouse.openCellSets = newWarehouse.openCellSets - requiredOpen;
    newWarehouse.closedCellSets = newWarehouse.closedCellSets - requiredClosed;

    // Inventory deduction is now handled by saveEstimate via delta logic
    
    // Pass false to suppress redirect to estimate_detail, so we can go to dashboard after generation
    // This updates the context with the new Work Order record and the updated warehouse
    const record = await saveEstimate(results, 'Work Order', { workOrderLines }, false, newWarehouse);
    
    if (record) {
        // 3. OPTIMISTIC UPDATE: Navigate Immediately
        dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
        dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Work Order Created. Processing in background...' } });
        
        // 4. Generate PDF Locally
        generateWorkOrderPDF(appData, record!);

        // 5. Background Sync & Sheet Creation
        // We do NOT await this here, allowing the UI to remain responsive.
        // We launch a fire-and-forget logic that updates state later.
        // We must pass the warehouse that saveEstimate just updated (which includes inventory deltas)
        // Since saveEstimate doesn't return the warehouse, we can rely on stateRef in the background function
        handleBackgroundWorkOrderGeneration(record);
    }
  };

  const handleBackgroundWorkOrderGeneration = async (record: EstimateRecord) => {
      const currentSession = stateRef.current.session;
      if (!currentSession?.spreadsheetId) return;
      
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
      
      try {
          // Create Standalone Sheet for Crew Log (Slow API Call)
          const woUrl = await createWorkOrderSheet(record, currentSession.folderId, currentSession.spreadsheetId);
          
          let finalRecord = record;
          if (woUrl) {
              finalRecord = { ...record, workOrderSheetUrl: woUrl };
              // Update local state with the new URL
              dispatch({ type: 'UPDATE_SAVED_ESTIMATE', payload: finalRecord });
          }
          
          // Construct state snapshot for sync using LATEST state from ref
          const latestAppData = stateRef.current.appData;
          
          let currentCustomers = [...latestAppData.customers];
          if (!currentCustomers.find(c => c.id === record.customer.id)) {
              currentCustomers.push(record.customer);
          }
          
          // Ensure we have the most up-to-date estimates list
          let freshEstimates = [...latestAppData.savedEstimates];
          const recIdx = freshEstimates.findIndex(e => e.id === record.id);
          if (recIdx >= 0) freshEstimates[recIdx] = finalRecord;
          else freshEstimates.unshift(finalRecord);

          const updatedState = { 
              ...latestAppData, 
              customers: currentCustomers, 
              warehouse: latestAppData.warehouse,
              savedEstimates: freshEstimates
          };

          await syncUp(updatedState, currentSession.spreadsheetId);
          
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Work Order & Sheet Synced Successfully' } });

      } catch (e) {
          console.error("Background WO Sync Error", e);
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Background Sync Failed. Check Connection.' } });
      }
  };

  const createPurchaseOrder = async (po: PurchaseOrder) => {
      // Add stock to warehouse
      const newWarehouse = { ...appData.warehouse };
      po.items.forEach(item => {
          if (item.type === 'open_cell') newWarehouse.openCellSets += item.quantity;
          if (item.type === 'closed_cell') newWarehouse.closedCellSets += item.quantity;
          if (item.type === 'inventory' && item.inventoryId) {
              const invItem = newWarehouse.items.find(i => i.id === item.inventoryId);
              if (invItem) invItem.quantity += item.quantity;
          }
      });

      const updatedPOs = [...(appData.purchaseOrders || []), po];
      
      dispatch({ type: 'UPDATE_DATA', payload: { warehouse: newWarehouse, purchaseOrders: updatedPOs } });
      dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Order Saved & Stock Updated' } });
      dispatch({ type: 'SET_VIEW', payload: 'warehouse' });
      
      if (session?.spreadsheetId) {
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
          const updatedState = { ...appData, warehouse: newWarehouse, purchaseOrders: updatedPOs };
          await syncUp(updatedState, session.spreadsheetId);
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
      }
  };

  return {
    loadEstimateForEditing,
    saveEstimate,
    handleDeleteEstimate,
    handleMarkPaid,
    saveCustomer,
    confirmWorkOrder,
    createPurchaseOrder
  };
};
