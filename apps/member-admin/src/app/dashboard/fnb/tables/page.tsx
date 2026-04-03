'use client';

import { useState, useEffect } from 'react';
import { fnbService, FnbTable, TableStatus } from '@/services/fnb.service';
import { Grid3x3, Plus, Edit2, Trash2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FnbTablesPage() {
  const [tables, setTables] = useState<FnbTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<FnbTable | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const response = await fnbService.getTables();
      setTables(response);
    } catch (error: any) {
      console.error('Failed to load tables:', error);
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (table: FnbTable) => {
    if (!confirm(`Delete table ${table.tableNumber}?`)) return;

    try {
      await fnbService.deleteTable(table.id);
      toast.success('Table deleted');
      await loadTables();
    } catch (error: any) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete table');
    }
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return 'bg-green-100 text-green-800 border-green-300';
      case TableStatus.OCCUPIED:
        return 'bg-red-100 text-red-800 border-red-300';
      case TableStatus.RESERVED:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
          <p className="text-gray-600 mt-1">Manage restaurant tables and seating</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Table
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Grid3x3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tables found</h3>
          <p className="text-gray-600 mb-6">Add your first table to get started</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Add Table
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`border-2 rounded-lg p-4 text-center ${getStatusColor(table.status)}`}
            >
              <div className="text-2xl font-bold mb-2">{table.tableNumber}</div>
              <div className="text-sm mb-2">Capacity: {table.capacity}</div>
              {table.floor && <div className="text-xs mb-2">{table.floor}</div>}
              <div className="text-xs font-semibold uppercase mb-3">{table.status}</div>
              <div className="flex gap-1 justify-center">
                <button
                  onClick={() => {
                    setSelectedTable(table);
                    setShowModal(true);
                  }}
                  className="p-1 hover:bg-white/50 rounded"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(table)}
                  className="p-1 hover:bg-white/50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TableFormModal
          table={selectedTable}
          onClose={() => {
            setShowModal(false);
            setSelectedTable(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setSelectedTable(null);
            loadTables();
          }}
        />
      )}
    </div>
  );
}

function TableFormModal({
  table,
  onClose,
  onSuccess,
}: {
  table: FnbTable | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    storeId: table?.storeId || '',
    tableNumber: table?.tableNumber || '',
    capacity: table?.capacity || 4,
    floor: table?.floor || '',
    status: table?.status || TableStatus.AVAILABLE,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      if (table) {
        await fnbService.updateTable(table.id, formData);
        toast.success('Table updated');
      } else {
        await fnbService.createTable(formData);
        toast.success('Table created');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save:', error);
      toast.error('Failed to save table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {table ? 'Edit Table' : 'Add Table'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!table && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Store ID *
              </label>
              <input
                type="text"
                value={formData.storeId}
                onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Table Number *
            </label>
            <input
              type="text"
              value={formData.tableNumber}
              onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity *
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Floor
            </label>
            <input
              type="text"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              placeholder="e.g., Ground Floor, 1st Floor"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {table && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TableStatus })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={TableStatus.AVAILABLE}>Available</option>
                <option value={TableStatus.OCCUPIED}>Occupied</option>
                <option value={TableStatus.RESERVED}>Reserved</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {table ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
