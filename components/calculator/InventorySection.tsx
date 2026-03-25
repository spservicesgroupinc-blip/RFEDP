
import React from 'react';
import { Box, Plus, Trash2 } from 'lucide-react';
import { CalculatorState } from '../../types';

interface InventorySectionProps {
  state: CalculatorState;
  onInventoryUpdate: (id: string, field: string, value: any) => void;
  onAddInventory: () => void;
  onRemoveInventory: (id: string) => void;
  onCreateWarehouseItem?: (name: string, unit: string, cost: number) => void;
}

export const InventorySection: React.FC<InventorySectionProps> = ({
  state,
  onInventoryUpdate,
  onAddInventory,
  onRemoveInventory,
  onCreateWarehouseItem,
}) => {
  const handleWarehouseSelect = (itemId: string, warehouseItemId: string) => {
    if (warehouseItemId === 'create_new') {
      const name = prompt("Enter new item name (e.g. Poly Plastic):");
      if (!name) return;
      const unit = prompt("Enter unit (e.g. Roll, Box):", "Unit") || "Unit";
      const costStr = prompt("Enter cost per unit:", "0.00");
      const cost = parseFloat(costStr || "0") || 0;

      if (onCreateWarehouseItem) {
        onCreateWarehouseItem(name, unit, cost);
        onInventoryUpdate(itemId, 'name', name);
        onInventoryUpdate(itemId, 'unit', unit);
        onInventoryUpdate(itemId, 'unitCost', cost);
      }
    } else {
      const warehouseItem = state.warehouse.items.find(w => w.id === warehouseItemId);
      if (warehouseItem) {
        onInventoryUpdate(itemId, 'warehouseItemId', warehouseItem.id);
        onInventoryUpdate(itemId, 'name', warehouseItem.name);
        onInventoryUpdate(itemId, 'unit', warehouseItem.unit);
        onInventoryUpdate(itemId, 'unitCost', warehouseItem.unitCost);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-widest">
          <Box className="w-5 h-5 text-brand" /> Prep & Inventory
        </h3>
        <button
          onClick={onAddInventory}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Item
        </button>
      </div>

      <div className="space-y-4">
        {state.inventory.length === 0 ? (
          <div className="text-center py-6 text-slate-300 text-xs italic border-2 border-dashed border-slate-100 rounded-xl">
            No extra inventory items added.
          </div>
        ) : (
          state.inventory.map(item => (
            <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Quick Add from Warehouse</label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-brand cursor-pointer"
                      onChange={(e) => handleWarehouseSelect(item.id, e.target.value)}
                      defaultValue=""
                    >
                      <option value="" disabled>Select Item from Warehouse...</option>
                      <option value="create_new" className="text-brand font-black">+ Create New Item</option>
                      {state.warehouse.items.map(w => (
                        <option key={w.id} value={w.id}>{w.name} (Qty: {w.quantity} {w.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Qty</label>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => onInventoryUpdate(item.id, 'quantity', parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-center"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Cost ($)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={item.unitCost || ''}
                      onChange={(e) => onInventoryUpdate(item.id, 'unitCost', parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-center"
                    />
                  </div>
                  <button
                    onClick={() => onRemoveInventory(item.id)}
                    className="mt-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Or type custom item name..."
                  value={item.name}
                  onChange={(e) => onInventoryUpdate(item.id, 'name', e.target.value)}
                  className="w-full bg-transparent border-b border-slate-200 p-1 text-xs text-slate-500 focus:border-brand focus:text-slate-900 outline-none"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
