import { useEffect, useRef } from 'react';
import { useCalculator, DEFAULT_STATE } from '../context/CalculatorContext';
import { 
  getEstimates, 
  getCustomers, 
  getInventoryItems, 
  getCompanySettings,
  updateCompanySettings,
  createEstimate,
  updateEstimate,
  createCustomer,
  updateCustomer,
} from '../services/api';

export const useSync = () => {
  const { state, dispatch } = useCalculator();
  const { session, appData, ui } = state;
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. SESSION RECOVERY
  useEffect(() => {
    const savedSession = localStorage.getItem('foamProSession');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        dispatch({ type: 'SET_SESSION', payload: parsedSession });
      } catch (e) {
        localStorage.removeItem('foamProSession');
      }
    } else {
        // If no session, ensure loading stops
        dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  // 2. INITIALIZE FROM SUPABASE
  useEffect(() => {
    if (!session) return;

    const initializeApp = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });

      try {
        // Load all data from Supabase in parallel
        const [estimates, customers, inventory, settings] = await Promise.all([
          getEstimates(),
          getCustomers(),
          getInventoryItems(),
          getCompanySettings(),
        ]);

        // Merge loaded data with default state
        const mergedState = {
          ...DEFAULT_STATE,
          savedEstimates: estimates,
          customers: customers,
          warehouse: {
            ...DEFAULT_STATE.warehouse,
            items: inventory,
          },
          costs: settings?.costs_json || DEFAULT_STATE.costs,
          yields: settings?.yields_json || DEFAULT_STATE.yields,
          lifetimeUsage: settings?.lifetime_usage || DEFAULT_STATE.lifetimeUsage,
          expenses: settings?.pricing_defaults || DEFAULT_STATE.expenses,
        };

        dispatch({ type: 'LOAD_DATA', payload: mergedState });
        dispatch({ type: 'SET_INITIALIZED', payload: true });
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'success' });

        // Clear successful sync status after delay
        setTimeout(() => {
            dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
        }, 3000);

      } catch (e) {
          console.error("Supabase sync failed:", e);
          
          // Fallback to default state
          dispatch({ type: 'LOAD_DATA', payload: DEFAULT_STATE });
          dispatch({ type: 'SET_INITIALIZED', payload: true });
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Sync Failed. Using default state.' } });
      } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeApp();
  }, [session, dispatch]);

  // 3. AUTO-SAVE TO SUPABASE (Debounced)
  useEffect(() => {
    if (ui.isLoading || !ui.isInitialized || !session) return;
    if (session.role === 'crew') return; // Crew doesn't auto-sync

    const currentStateStr = JSON.stringify(appData);

    // Always backup to local storage
    localStorage.setItem(`foamProState_${session.username}`, currentStateStr);

    // Debounce the Supabase Sync
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'pending' });
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(async () => {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });

      try {
        // Save company settings
        await updateCompanySettings({
          costs: appData.costs,
          yields: appData.yields,
          warehouse: appData.warehouse,
          lifetimeUsage: appData.lifetimeUsage,
          pricingDefaults: appData.expenses,
        });

        dispatch({ type: 'SET_SYNC_STATUS', payload: 'success' });
        setTimeout(() => dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' }), 3000);
      } catch (error) {
        console.error('Auto-save error:', error);
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      }
    }, 3000);

    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [appData, ui.isLoading, ui.isInitialized, session, dispatch]);

  // 4. MANUAL FORCE SYNC
  const handleManualSync = async () => {
    if (!session) return;
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });

    try {
      // Save company settings
      await updateCompanySettings({
        costs: appData.costs,
        yields: appData.yields,
        warehouse: appData.warehouse,
        lifetimeUsage: appData.lifetimeUsage,
        pricingDefaults: appData.expenses,
      });

      dispatch({ type: 'SET_SYNC_STATUS', payload: 'success' });
      dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Sync Complete' } });
      setTimeout(() => dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' }), 3000);
    } catch (error) {
      console.error('Manual sync error:', error);
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Sync Failed. Check connection.' } });
    }
  };

  // 5. FORCE REFRESH - Reload all data from Supabase
  const forceRefresh = async () => {
      if (!session) return;
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
      
      try {
        const [estimates, customers, inventory, settings] = await Promise.all([
          getEstimates(),
          getCustomers(),
          getInventoryItems(),
          getCompanySettings(),
        ]);

        const mergedState = {
          ...appData,
          savedEstimates: estimates,
          customers: customers,
          warehouse: {
            ...appData.warehouse,
            items: inventory,
          },
          costs: settings?.costs_json || appData.costs,
          yields: settings?.yields_json || appData.yields,
          lifetimeUsage: settings?.lifetime_usage || appData.lifetimeUsage,
        };

        dispatch({ type: 'LOAD_DATA', payload: mergedState });
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'success' });
        setTimeout(() => dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' }), 3000);
      } catch (e) {
          console.error(e);
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Refresh Failed.' } });
      }
  };

  // ============================================================================
  // INDIVIDUAL ENTITY SAVE FUNCTIONS
  // ============================================================================

  /**
   * Save a single estimate to Supabase
   */
  const saveEstimateToSupabase = async (estimate: any): Promise<boolean> => {
    if (!session) return false;
    
    try {
      if (estimate.id) {
        return await updateEstimate(estimate.id, estimate);
      } else {
        const newId = await createEstimate(estimate);
        return !!newId;
      }
    } catch (error) {
      console.error('Save estimate error:', error);
      return false;
    }
  };

  /**
   * Save a single customer to Supabase
   */
  const saveCustomerToSupabase = async (customer: any): Promise<boolean> => {
    if (!session) return false;
    
    try {
      if (customer.id) {
        return await updateCustomer(customer.id, customer);
      } else {
        const newId = await createCustomer(customer);
        return !!newId;
      }
    } catch (error) {
      console.error('Save customer error:', error);
      return false;
    }
  };

  return { 
    handleManualSync, 
    forceRefresh,
    saveEstimateToSupabase,
    saveCustomerToSupabase,
  };
};
