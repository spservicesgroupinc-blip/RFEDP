/**
 * Supabase API Service
 * Replaces Google Apps Script backend with Supabase database operations
 */

import { supabase } from './supabase';
import type { CalculatorState, EstimateRecord, UserSession, CustomerProfile, WarehouseItem } from '../types';

interface ApiResponse {
  status: 'success' | 'error';
  data?: any;
  message?: string;
}

/**
 * Helper to check if Supabase is configured
 */
const isApiConfigured = () => {
  return supabase !== null;
};

/**
 * Fetches the full application state from Supabase
 * For now, returns null as we're migrating to direct Supabase queries
 */
export const syncDown = async (spreadsheetId: string): Promise<Partial<CalculatorState> | null> => {
  // Deprecated: Use direct Supabase queries instead
  console.warn('syncDown is deprecated. Use direct Supabase queries from hooks.');
  return null;
};

/**
 * Pushes the full application state to Supabase
 * For now, returns false as we're migrating to direct Supabase queries
 */
export const syncUp = async (state: CalculatorState, spreadsheetId: string): Promise<boolean> => {
  // Deprecated: Use direct Supabase queries instead
  console.warn('syncUp is deprecated. Use direct Supabase queries from hooks.');
  return false;
};

/**
 * Marks job as paid and creates P&L record
 */
export const markJobPaid = async (estimateId: string): Promise<{success: boolean, estimate?: EstimateRecord}> => {
  if (!isApiConfigured()) {
    return { success: false };
  }

  try {
    // Update estimate status
    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', estimateId);

    if (updateError) throw updateError;

    // Create P&L record via RPC function
    const { error: plError } = await supabase.rpc('create_profit_loss_record', { p_estimate_id: estimateId });
    if (plError) console.error('P&L record creation error:', plError);

    return { success: true };
  } catch (error: any) {
    console.error('Mark job paid error:', error);
    return { success: false };
  }
};

/**
 * Creates a work order record in Supabase
 */
export const createWorkOrderSheet = async (estimateData: EstimateRecord): Promise<string | null> => {
  // Deprecated: PDF generation is now client-side with Supabase Storage
  console.warn('createWorkOrderSheet is deprecated. Use client-side PDF generation with Supabase Storage.');
  return null;
};

/**
 * Logs crew time to the estimate
 */
export const logCrewTime = async (
  estimateId: string, 
  startTime: string, 
  endTime: string | null, 
  userId: string
): Promise<boolean> => {
  if (!isApiConfigured()) return false;

  try {
    const { error } = await supabase
      .from('material_logs')
      .insert({
        company_id: (await supabase.from('profiles').select('company_id').eq('id', userId).single()).data?.company_id,
        estimate_id: estimateId,
        material_name: 'Labor',
        material_category: 'labor',
        quantity: 0,
        unit: 'hours',
        logged_by_id: userId,
        log_date: new Date().toISOString().split('T')[0],
        log_type: 'labor_log',
        notes: `Start: ${startTime}, End: ${endTime || 'Ongoing'}`,
      });

    return !error;
  } catch (error) {
    console.error('Log crew time error:', error);
    return false;
  }
};

/**
 * Marks job as complete, logs material usage, and deducts inventory on-hand counts
 */
export const completeJob = async (
  estimateId: string,
  actuals: {
    openCellSets: number;
    closedCellSets: number;
    inventory: Array<{ id?: string; warehouseItemId?: string; name: string; quantity: number; unit: string }>;
  }
): Promise<boolean> => {
  if (!isApiConfigured()) return false;

  try {
    // Get current user session and company_id once
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('No profile found');
    const companyId = profile.company_id;

    // 1. Mark estimate as completed
    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        execution_status: 'completed',
        calculation_snapshot: { ...actuals },
        updated_at: new Date().toISOString(),
      })
      .eq('id', estimateId);

    if (updateError) throw updateError;

    // 2. Deduct general inventory items from warehouse on-hand counts
    const inventoryDeductions = actuals.inventory.filter(
      item => item.warehouseItemId && item.quantity > 0
    );

    for (const item of inventoryDeductions) {
      // Fetch current quantity
      const { data: warehouseItem, error: fetchError } = await supabase
        .from('inventory_items')
        .select('id, quantity')
        .eq('id', item.warehouseItemId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !warehouseItem) {
        console.warn(`Could not find warehouse item ${item.warehouseItemId} for deduction`);
        continue;
      }

      const newQuantity = (warehouseItem.quantity || 0) - item.quantity;

      const { error: deductError } = await supabase
        .from('inventory_items')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', item.warehouseItemId)
        .eq('company_id', companyId);

      if (deductError) {
        console.error(`Failed to deduct inventory for ${item.name}:`, deductError);
      }
    }

    // 3. Deduct foam sets from company_settings.warehouse_counts
    if (actuals.openCellSets > 0 || actuals.closedCellSets > 0) {
      const { data: settings, error: settingsError } = await supabase
        .from('company_settings')
        .select('id, warehouse_counts')
        .eq('company_id', companyId)
        .single();

      if (!settingsError && settings) {
        const counts = settings.warehouse_counts || {};
        const updatedCounts = {
          ...counts,
          openCellSets: Math.max(0, (counts.openCellSets || 0) - actuals.openCellSets),
          closedCellSets: Math.max(0, (counts.closedCellSets || 0) - actuals.closedCellSets),
        };

        await supabase
          .from('company_settings')
          .update({ warehouse_counts: updatedCounts, updated_at: new Date().toISOString() })
          .eq('id', settings.id);
      }
    }

    // 4. Log all material usage to material_logs
    const logEntries = [];

    if (actuals.openCellSets > 0) {
      logEntries.push({
        company_id: companyId,
        estimate_id: estimateId,
        material_name: 'Open Cell Foam',
        material_category: 'open_cell',
        quantity: actuals.openCellSets,
        unit: 'sets',
        logged_by_id: session.user.id,
        log_date: new Date().toISOString().split('T')[0],
        log_type: 'usage',
        notes: 'Logged on job completion',
      });
    }

    if (actuals.closedCellSets > 0) {
      logEntries.push({
        company_id: companyId,
        estimate_id: estimateId,
        material_name: 'Closed Cell Foam',
        material_category: 'closed_cell',
        quantity: actuals.closedCellSets,
        unit: 'sets',
        logged_by_id: session.user.id,
        log_date: new Date().toISOString().split('T')[0],
        log_type: 'usage',
        notes: 'Logged on job completion',
      });
    }

    for (const item of actuals.inventory) {
      if (item.quantity > 0) {
        logEntries.push({
          company_id: companyId,
          estimate_id: estimateId,
          material_name: item.name,
          material_category: 'supplementary',
          quantity: item.quantity,
          unit: item.unit,
          logged_by_id: session.user.id,
          log_date: new Date().toISOString().split('T')[0],
          log_type: 'usage',
          notes: 'Logged on job completion',
        });
      }
    }

    if (logEntries.length > 0) {
      const { error: logError } = await supabase.from('material_logs').insert(logEntries);
      if (logError) console.error('Material log insert error:', logError);
    }

    return true;
  } catch (error) {
    console.error('Complete job error:', error);
    return false;
  }
};

/**
 * Deletes an estimate from Supabase
 */
export const deleteEstimate = async (estimateId: string): Promise<boolean> => {
  if (!isApiConfigured()) return false;

  try {
    const { error } = await supabase
      .from('estimates')
      .delete()
      .eq('id', estimateId);

    return !error;
  } catch (error) {
    console.error('Delete estimate error:', error);
    return false;
  }
};

/**
 * Uploads a PDF to Supabase Storage
 */
export const savePdfToDrive = async (
  fileName: string, 
  base64Data: string, 
  estimateId: string | undefined,
  folderId?: string
): Promise<string | null> => {
  if (!isApiConfigured()) return null;

  try {
    const companyId = await (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', session.user.id).single();
      return profile?.company_id;
    })();

    if (!companyId) return null;

    const filePath = `${companyId}/estimates/${estimateId || 'draft'}/${fileName}`;
    
    // Convert base64 to blob
    const blob = await fetch(`data:application/pdf;base64,${base64Data}`).then(r => r.blob());

    const { data, error } = await supabase.storage
      .from('job_attachments')
      .upload(filePath, blob, { upsert: true });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('job_attachments')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Save PDF error:', error);
    return null;
  }
};

/**
 * Uploads an image to Supabase Storage
 */
export const uploadImage = async (
  base64Data: string, 
  fileName: string = 'image.jpg'
): Promise<string | null> => {
  if (!isApiConfigured()) return null;

  try {
    const companyId = await (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', session.user.id).single();
      return profile?.company_id;
    })();

    if (!companyId) return null;

    const filePath = `${companyId}/site-photos/${Date.now()}-${fileName}`;
    
    // Convert base64 to blob
    const blob = await fetch(base64Data).then(r => r.blob());

    const { data, error } = await supabase.storage
      .from('job_attachments')
      .upload(filePath, blob, { upsert: true });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('job_attachments')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload image error:', error);
    return null;
  }
};

// ============================================================================
// DIRECT SUPABASE QUERY FUNCTIONS (Recommended approach)
// ============================================================================

// ============================================================================
// ENUM MAPPING HELPERS
// ============================================================================

const appStatusToDb: Record<string, string> = {
  'Draft': 'draft',
  'Work Order': 'work_order',
  'Invoiced': 'invoiced',
  'Paid': 'paid',
  'Archived': 'archived',
};

const dbStatusToApp: Record<string, EstimateRecord['status']> = {
  'draft': 'Draft',
  'work_order': 'Work Order',
  'invoiced': 'Invoiced',
  'paid': 'Paid',
  'archived': 'Archived',
};

const appExecStatusToDb: Record<string, string> = {
  'Not Started': 'not_started',
  'In Progress': 'in_progress',
  'Completed': 'completed',
};

const dbExecStatusToApp: Record<string, EstimateRecord['executionStatus']> = {
  'not_started': 'Not Started',
  'in_progress': 'In Progress',
  'completed': 'Completed',
};

const appCustomerStatusToDb: Record<string, string> = {
  'Active': 'active',
  'Archived': 'archived',
  'Lead': 'lead',
};

const dbCustomerStatusToApp: Record<string, CustomerProfile['status']> = {
  'active': 'Active',
  'archived': 'Archived',
  'lead': 'Lead',
};

/**
 * Get all estimates for current user's company
 */
export const getEstimates = async (): Promise<EstimateRecord[]> => {
  if (!isApiConfigured()) return [];

  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get estimates error:', error);
    return [];
  }

  // Reconstruct EstimateRecord from DB row + calculation_snapshot
  return (data || []).map((row: any) => {
    const snapshot: Partial<EstimateRecord> = row.calculation_snapshot || {};
    return {
      ...snapshot,
      // Authoritative DB fields override snapshot
      id: row.id,
      customerId: snapshot.customerId || row.customer_id,
      date: row.date || snapshot.date,
      status: dbStatusToApp[row.status] || snapshot.status || 'Draft',
      executionStatus: dbExecStatusToApp[row.execution_status] || snapshot.executionStatus || 'Not Started',
      totalValue: Number(row.total_value) || snapshot.totalValue || 0,
      invoiceNumber: row.invoice_number || snapshot.invoiceNumber,
      invoiceDate: row.invoice_date || snapshot.invoiceDate,
      notes: row.internal_notes || snapshot.notes,
    } as EstimateRecord;
  });
};

/**
 * Get a single estimate by ID
 */
export const getEstimateById = async (id: string): Promise<EstimateRecord | null> => {
  if (!isApiConfigured()) return null;

  const { data, error } = await supabase
    .from('estimates')
    .select('*, customers(*)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as EstimateRecord;
};

/**
 * Get all customers for current user's company
 */
export const getCustomers = async (): Promise<CustomerProfile[]> => {
  if (!isApiConfigured()) return [];

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');

  if (error) {
    console.error('Get customers error:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name || '',
    address: row.address_line1 || '',
    city: row.city || '',
    state: row.state || '',
    zip: row.zip || '',
    phone: row.phone || '',
    email: row.email || '',
    notes: row.notes || '',
    status: dbCustomerStatusToApp[row.status] || 'Lead',
  }));
};

/**
 * Get all inventory items for current user's company
 */
export const getInventoryItems = async (): Promise<WarehouseItem[]> => {
  if (!isApiConfigured()) return [];

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('name');

  if (error) {
    console.error('Get inventory error:', error);
    return [];
  }

  return data as WarehouseItem[];
};

/**
 * Get company settings
 */
export const getCompanySettings = async (): Promise<any> => {
  if (!isApiConfigured()) return null;

  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .single();

  if (error) return null;
  return data;
};

/**
 * Update company settings
 */
export const updateCompanySettings = async (settings: any): Promise<boolean> => {
  if (!isApiConfigured()) return false;

  const { data: existing } = await supabase
    .from('company_settings')
    .select('id')
    .single();

  if (existing) {
    const { error } = await supabase
      .from('company_settings')
      .update({
        costs_json: settings.costs || {},
        yields_json: settings.yields || {},
        warehouse_counts: {
          openCellSets: settings.warehouse?.openCellSets ?? 0,
          closedCellSets: settings.warehouse?.closedCellSets ?? 0,
        },
        lifetime_usage: settings.lifetimeUsage || {},
        pricing_defaults: settings.pricingDefaults || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    return !error;
  } else {
    const { error } = await supabase
      .from('company_settings')
      .insert({
        costs_json: settings.costs || {},
        yields_json: settings.yields || {},
        warehouse_counts: {
          openCellSets: settings.warehouse?.openCellSets ?? 0,
          closedCellSets: settings.warehouse?.closedCellSets ?? 0,
        },
        lifetime_usage: settings.lifetimeUsage || {},
        pricing_defaults: settings.pricingDefaults || {},
      });

    return !error;
  }
};

/**
 * Create a new estimate
 */
export const createEstimate = async (estimate: Partial<EstimateRecord>): Promise<string | null> => {
  if (!isApiConfigured()) return null;

  const { data, error } = await supabase
    .from('estimates')
    .insert(estimate as any)
    .select('id')
    .single();

  if (error) {
    console.error('Create estimate error:', error);
    return null;
  }

  return data.id;
};

/**
 * Update an estimate
 */
export const updateEstimate = async (id: string, updates: Partial<EstimateRecord>): Promise<boolean> => {
  if (!isApiConfigured()) return false;

  const { error } = await supabase
    .from('estimates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return !error;
};

/**
 * Create a new customer
 */
export const createCustomer = async (customer: CustomerProfile): Promise<string | null> => {
  if (!isApiConfigured()) return null;

  const { data, error } = await supabase
    .from('customers')
    .insert(customer as any)
    .select('id')
    .single();

  if (error) {
    console.error('Create customer error:', error);
    return null;
  }

  return data.id;
};

/**
 * Update a customer
 */
export const updateCustomer = async (id: string, updates: Partial<CustomerProfile>): Promise<boolean> => {
  if (!isApiConfigured()) return false;

  const { error } = await supabase
    .from('customers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return !error;
};

/**
 * Get material logs for an estimate
 */
export const getMaterialLogs = async (estimateId: string): Promise<any[]> => {
  if (!isApiConfigured()) return [];

  const { data, error } = await supabase
    .from('material_logs')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('log_date', { ascending: false });

  if (error) {
    console.error('Get material logs error:', error);
    return [];
  }

  return data;
};

/**
 * Save a purchase order to Supabase
 */
export const savePurchaseOrder = async (po: {
  po_number: string;
  vendor_name: string;
  status: string;
  items: any[];
  total_cost: number;
  notes?: string;
  order_date: string;
}): Promise<string | null> => {
  if (!isApiConfigured()) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  const { data, error } = await supabase
    .from('purchase_orders')
    .insert({ ...po, company_id: profile.company_id })
    .select('id')
    .single();

  if (error) {
    console.error('Save purchase order error:', error);
    return null;
  }

  return data.id;
};

/**
 * Create a material log entry
 */
export const createMaterialLog = async (log: {
  estimate_id: string;
  material_name: string;
  material_category: string;
  quantity: number;
  unit: string;
  notes?: string;
}): Promise<boolean> => {
  if (!isApiConfigured()) return false;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single();

  if (!profile) return false;

  const { error } = await supabase
    .from('material_logs')
    .insert({
      company_id: profile.company_id,
      estimate_id: log.estimate_id,
      material_name: log.material_name,
      material_category: log.material_category,
      quantity: log.quantity,
      unit: log.unit,
      logged_by_id: session.user.id,
      log_date: new Date().toISOString().split('T')[0],
      notes: log.notes,
    });

  return !error;
};

// ============================================================================
// UPSERT FUNCTIONS (for optimistic updates with debounce)
// ============================================================================

/**
 * Upsert company settings (insert or update by company_id)
 */
export const upsertCompanySettings = async (settings: {
  costs?: any;
  yields?: any;
  warehouse?: any;
  lifetimeUsage?: any;
  pricingDefaults?: any;
}): Promise<boolean> => {
  if (!isApiConfigured()) return false;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single();

  if (!profile) return false;

  const { error } = await supabase
    .from('company_settings')
    .upsert({
      company_id: profile.company_id,
      costs_json: settings.costs || {},
      yields_json: settings.yields || {},
      warehouse_counts: settings.warehouse || {},
      lifetime_usage: settings.lifetimeUsage || {},
      pricing_defaults: settings.pricingDefaults || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' });

  return !error;
};

/**
 * Upsert estimate (insert or update by id)
 * Maps EstimateRecord (camelCase) to DB schema (snake_case).
 * Stores full record in calculation_snapshot for round-trip fidelity.
 */
export const upsertEstimate = async (estimate: Partial<EstimateRecord>): Promise<boolean> => {
  if (!isApiConfigured()) return false;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single();

  if (!profile) return false;

  const dbRow: Record<string, any> = {
    id: estimate.id,
    company_id: profile.company_id,
    customer_id: estimate.customerId || null,
    date: estimate.date ? estimate.date.split('T')[0] : new Date().toISOString().split('T')[0],
    status: appStatusToDb[estimate.status || 'Draft'] || 'draft',
    execution_status: appExecStatusToDb[estimate.executionStatus || 'Not Started'] || 'not_started',
    total_value: estimate.totalValue || 0,
    material_cost: estimate.results?.materialCost || 0,
    labor_cost: estimate.results?.laborCost || 0,
    retail_price: estimate.results?.totalCost || 0,
    invoice_number: estimate.invoiceNumber || null,
    invoice_date: estimate.invoiceDate ? estimate.invoiceDate.split('T')[0] : null,
    internal_notes: estimate.notes || null,
    calculation_snapshot: estimate,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('estimates')
    .upsert(dbRow, { onConflict: 'id' });

  if (error) console.error('upsertEstimate error:', error);
  return !error;
};

/**
 * Upsert customer (insert or update by id)
 * Maps CustomerProfile (camelCase) to DB schema (snake_case).
 */
export const upsertCustomer = async (customer: CustomerProfile): Promise<boolean> => {
  if (!isApiConfigured()) return false;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single();

  if (!profile) return false;

  const dbRow: Record<string, any> = {
    id: customer.id,
    company_id: profile.company_id,
    name: customer.name,
    address_line1: customer.address || null,
    city: customer.city || null,
    state: customer.state || null,
    zip: customer.zip || null,
    phone: customer.phone || null,
    email: customer.email || null,
    notes: customer.notes || null,
    status: appCustomerStatusToDb[customer.status || 'Lead'] || 'lead',
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('customers')
    .upsert(dbRow, { onConflict: 'id' });

  if (error) console.error('upsertCustomer error:', error);
  return !error;
};
