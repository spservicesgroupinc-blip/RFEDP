import React from 'react';
import { useCalculator, DEFAULT_STATE } from '../context/CalculatorContext';
import { EstimateRecord, CalculationResults, CustomerProfile, PurchaseOrder, InvoiceLineItem } from '../types';
import {
  deleteEstimate,
  markJobPaid,
  createWorkOrderSheet,
  savePdfToDrive,
  getEstimates,
  getCustomers,
  getInventoryItems,
  upsertEstimate,
  upsertCustomer,
  savePurchaseOrder,
} from '../services/api';
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

  const saveEstimate = async (
    results: CalculationResults, 
    targetStatus?: EstimateRecord['status'], 
    extraData?: Partial<EstimateRecord>, 
    shouldRedirect: boolean = true, 
    overrideWarehouse?: any
  ): Promise<EstimateRecord | null> => {
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

    // Background Supabase upsert (non-blocking)
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'pending' });
    (async () => {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
      const ok = await upsertEstimate(newEstimate);
      dispatch({ type: 'SET_SYNC_STATUS', payload: ok ? 'success' : 'error' });
      if (ok) setTimeout(() => dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' }), 3000);
    })();

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

      // Use updatePayload to ensure warehouse restore is applied
      dispatch({ type: 'UPDATE_DATA', payload: updatePayload });

      if (ui.editingEstimateId === id) {
          dispatch({ type: 'SET_EDITING_ESTIMATE', payload: null });
          dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
      }
      
      // Delete from Supabase
      try {
          await deleteEstimate(id);
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Job Deleted' } });
      } catch (err) {
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Local delete success, but server failed.' } });
      }
    }
  };

  const handleMarkPaid = async (id: string) => {
      const estimate = appData.savedEstimates.find(e => e.id === id);
      if (estimate) {
         dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Processing Payment & P&L...' } });
         dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
         const result = await markJobPaid(id);
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

  const saveCustomer = async (customerData: CustomerProfile) => {
    let updatedCustomers = [...appData.customers];
    const existingIndex = updatedCustomers.findIndex(c => c.id === customerData.id);

    if (existingIndex >= 0) {
        updatedCustomers[existingIndex] = customerData;
    } else {
        updatedCustomers.push(customerData);
    }

    // 1. Optimistic local update first
    if (appData.customerProfile.id === customerData.id) {
        dispatch({ type: 'UPDATE_DATA', payload: { customers: updatedCustomers, customerProfile: customerData } });
    } else {
        dispatch({ type: 'UPDATE_DATA', payload: { customers: updatedCustomers } });
    }

    // 2. Background Supabase upsert
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'pending' });
    (async () => {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
      const ok = await upsertCustomer(customerData);
      dispatch({ type: 'SET_SYNC_STATUS', payload: ok ? 'success' : 'error' });
      if (ok) setTimeout(() => dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' }), 3000);
    })();
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

        // 5. Save to Supabase Storage in background
        handleBackgroundWorkOrderGeneration(record);
    }
  };

  const handleBackgroundWorkOrderGeneration = async (record: EstimateRecord) => {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });

      try {
          // Save PDF to Supabase Storage
          const pdfBlob = await generateWorkOrderPDF(appData, record);
          const blobData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(pdfBlob);
          });
          
          const pdfUrl = await savePdfToDrive(
            `WO-${record.id}.pdf`,
            blobData.split(',')[1],
            record.id
          );

          if (pdfUrl) {
              // Update record with PDF URL
              const updatedRecord = { ...record, pdfLink: pdfUrl };
              await updateEstimate(record.id, updatedRecord);
              dispatch({ type: 'UPDATE_SAVED_ESTIMATE', payload: updatedRecord });
          }

          dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Work Order saved successfully' } });

      } catch (e) {
          console.error("Background WO Sync Error", e);
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Background save failed. Check connection.' } });
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

      // Save purchase order to Supabase
      savePurchaseOrder({
        po_number: po.id,
        vendor_name: po.vendorName,
        status: po.status,
        items: po.items,
        total_cost: po.totalCost,
        notes: po.notes,
        order_date: po.date,
      }).catch(err => console.error('PO save failed:', err));
  };

  // ============================================================================
  // SUPABASE DATA FETCHING FUNCTIONS
  // ============================================================================

  /**
   * Load all estimates from Supabase
   */
  const loadEstimatesFromSupabase = async () => {
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      const estimates = await getEstimates();
      dispatch({ type: 'UPDATE_DATA', payload: { savedEstimates: estimates } });
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
    } catch (error) {
      console.error('Failed to load estimates:', error);
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Failed to load estimates' } });
    }
  };

  /**
   * Load all customers from Supabase
   */
  const loadCustomersFromSupabase = async () => {
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      const customers = await getCustomers();
      dispatch({ type: 'UPDATE_DATA', payload: { customers } });
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
    } catch (error) {
      console.error('Failed to load customers:', error);
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Failed to load customers' } });
    }
  };

  /**
   * Load all inventory items from Supabase
   */
  const loadInventoryFromSupabase = async () => {
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      const items = await getInventoryItems();
      dispatch({ type: 'UPDATE_DATA', payload: { 
        warehouse: { ...appData.warehouse, items }
      }});
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
    } catch (error) {
      console.error('Failed to load inventory:', error);
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Failed to load inventory' } });
    }
  };

  return {
    loadEstimateForEditing,
    saveEstimate,
    handleDeleteEstimate,
    handleMarkPaid,
    saveCustomer,
    confirmWorkOrder,
    createPurchaseOrder,
    // Supabase functions
    loadEstimatesFromSupabase,
    loadCustomersFromSupabase,
    loadInventoryFromSupabase,
  };
};
