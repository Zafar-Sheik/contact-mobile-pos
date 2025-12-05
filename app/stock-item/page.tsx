// app/stock-items/page.tsx
"use client";

import { useState, useEffect } from "react";
import BackArrow from "../components/BackArrow";

// Types
interface StockItem {
  _id: string;
  code: string;
  name: string;
  qty: number;
  category?: string;
  description?: string;
  dimensions?: string[];
  supplier?: {
    _id: string;
    supplierCode: string;
    name: string;
  };
  price: {
    cost: number;
    sellingC: number;
    VAT: number;
  };
  priceCategory?: {
    sellingA?: number;
    sellingB?: number;
    sellingD?: number;
    sellingE?: number;
  };
  stockLevel: {
    minStockLevel: number;
    maxStockLevel: number;
  };
  isActive: boolean;
  stockStatus: string;
  formattedCost: string;
  formattedSellingC: string;
  totalValue: number;
  formattedTotalValue: string;
  created_at: string;
}

interface Supplier {
  _id: string;
  supplierCode: string;
  name: string;
}

interface StockItemFormData {
  code: string;
  name: string;
  qty: string;
  category: string;
  description: string;
  dimensions: string;
  supplier: string;
  price: {
    cost: string;
    sellingC: string;
    VAT: string;
  };
  priceCategory: {
    sellingA: string;
    sellingB: string;
    sellingD: string;
    sellingE: string;
  };
  stockLevel: {
    minStockLevel: string;
    maxStockLevel: string;
  };
  isActive: boolean;
}

// Stock Item Modal Component
const StockItemModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialData,
  loading,
  suppliers,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StockItemFormData) => Promise<void>;
  title: string;
  initialData?: Partial<StockItemFormData>;
  loading: boolean;
  suppliers: Supplier[];
}) => {
  const [formData, setFormData] = useState<StockItemFormData>({
    code: "",
    name: "",
    qty: "0",
    category: "",
    description: "",
    dimensions: "",
    supplier: "",
    price: {
      cost: "",
      sellingC: "",
      VAT: "15",
    },
    priceCategory: {
      sellingA: "",
      sellingB: "",
      sellingD: "",
      sellingE: "",
    },
    stockLevel: {
      minStockLevel: "0",
      maxStockLevel: "10",
    },
    isActive: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || "",
        name: initialData.name || "",
        qty: initialData.qty || "0",
        category: initialData.category || "",
        description: initialData.description || "",
        dimensions: initialData.dimensions || "",
        supplier: initialData.supplier || "",
        price: initialData.price || { cost: "", sellingC: "", VAT: "15" },
        priceCategory: initialData.priceCategory || {
          sellingA: "",
          sellingB: "",
          sellingD: "",
          sellingE: "",
        },
        stockLevel: initialData.stockLevel || {
          minStockLevel: "0",
          maxStockLevel: "10",
        },
        isActive:
          initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
      setFormData({
        code: "",
        name: "",
        qty: "0",
        category: "",
        description: "",
        dimensions: "",
        supplier: "",
        price: {
          cost: "",
          sellingC: "",
          VAT: "15",
        },
        priceCategory: {
          sellingA: "",
          sellingB: "",
          sellingD: "",
          sellingE: "",
        },
        stockLevel: {
          minStockLevel: "0",
          maxStockLevel: "10",
        },
        isActive: true,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl my-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit(formData);
          }}
          className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Stock Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                placeholder="ITEM-001"
                pattern="[A-Z0-9_-]+"
                title="Uppercase letters, numbers, hyphens, and underscores only"
              />
              <p className="mt-1 text-xs text-gray-500">
                Uppercase letters, numbers, hyphens, underscores only
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                placeholder="Product Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                placeholder="Electronics, Tools, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Initial Quantity *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.qty}
                onChange={(e) =>
                  setFormData({ ...formData, qty: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Supplier
            </label>
            <select
              value={formData.supplier}
              onChange={(e) =>
                setFormData({ ...formData, supplier: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none">
              <option value="">Select Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name} ({supplier.supplierCode})
                </option>
              ))}
            </select>
          </div>

          {/* Pricing */}
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 font-medium text-gray-900">Pricing</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cost Price *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price.cost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: { ...formData.price, cost: e.target.value },
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Selling Price C *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price.sellingC}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: { ...formData.price, sellingC: e.target.value },
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  VAT % *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.price.VAT}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: { ...formData.price, VAT: e.target.value },
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="15"
                />
              </div>
            </div>

            <h4 className="mt-4 mb-2 text-sm font-medium text-gray-700">
              Price Categories (Optional)
            </h4>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs text-gray-700">Selling A</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.priceCategory.sellingA}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priceCategory: {
                        ...formData.priceCategory,
                        sellingA: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700">Selling B</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.priceCategory.sellingB}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priceCategory: {
                        ...formData.priceCategory,
                        sellingB: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700">Selling D</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.priceCategory.sellingD}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priceCategory: {
                        ...formData.priceCategory,
                        sellingD: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700">Selling E</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.priceCategory.sellingE}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priceCategory: {
                        ...formData.priceCategory,
                        sellingE: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Stock Levels */}
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 font-medium text-gray-900">Stock Levels</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Stock Level *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stockLevel.minStockLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stockLevel: {
                        ...formData.stockLevel,
                        minStockLevel: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Maximum Stock Level *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stockLevel.maxStockLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stockLevel: {
                        ...formData.stockLevel,
                        maxStockLevel: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="10"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                placeholder="Product description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Dimensions (comma separated)
              </label>
              <input
                type="text"
                value={formData.dimensions}
                onChange={(e) =>
                  setFormData({ ...formData, dimensions: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                placeholder="Length, Width, Height"
              />
              <p className="mt-1 text-xs text-gray-500">
                Separate multiple dimensions with commas
              </p>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Active Item
            </label>
            <span className="ml-2 text-xs text-gray-500">
              (Inactive items won't appear in sales)
            </span>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Stock Item Card Component
const StockItemCard = ({
  item,
  onEdit,
  onDelete,
}: {
  item: StockItem;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Low":
        return "bg-red-100 text-red-800";
      case "High":
        return "bg-green-100 text-green-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Low":
        return "⚠️";
      case "High":
        return "📈";
      default:
        return "✅";
    }
  };

  return (
    <div
      className={`rounded-lg border ${
        !item.isActive
          ? "border-gray-300 bg-gray-50"
          : "border-gray-200 bg-white"
      } p-4 hover:shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900">{item.name}</h3>
              {!item.isActive && (
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                  Inactive
                </span>
              )}
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
              {item.code}
            </span>
          </div>

          <div className="mt-2 flex items-center space-x-2">
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                item.stockStatus
              )}`}>
              {getStatusIcon(item.stockStatus)} {item.stockStatus} Stock
            </span>
            <span className="text-sm text-gray-600">
              Qty: <span className="font-medium">{item.qty}</span>
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-600">
              <span className="block text-xs text-gray-500">Cost</span>
              <span className="font-medium">{item.formattedCost}</span>
            </div>
            <div className="text-gray-600">
              <span className="block text-xs text-gray-500">Selling C</span>
              <span className="font-medium">{item.formattedSellingC}</span>
            </div>
            <div className="text-gray-600">
              <span className="block text-xs text-gray-500">Total Value</span>
              <span className="font-medium">{item.formattedTotalValue}</span>
            </div>
            <div className="text-gray-600">
              <span className="block text-xs text-gray-500">Stock Range</span>
              <span className="font-medium">
                {item.stockLevel.minStockLevel} -{" "}
                {item.stockLevel.maxStockLevel}
              </span>
            </div>
          </div>

          {item.category && (
            <p className="mt-2 text-sm text-gray-500">
              Category: <span className="font-medium">{item.category}</span>
            </p>
          )}

          {item.supplier && (
            <p className="mt-1 text-sm text-gray-500">
              Supplier:{" "}
              <span className="font-medium">{item.supplier.name}</span>
            </p>
          )}
        </div>

        <div className="ml-4 flex space-x-2">
          <button
            onClick={onEdit}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
            title="Edit">
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
            title="Delete">
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

// Bulk Update Modal
const BulkUpdateModal = ({
  isOpen,
  onClose,
  onSubmit,
  items,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updates: Array<{ id: string; qty: string }>) => Promise<void>;
  items: StockItem[];
}) => {
  const [updates, setUpdates] = useState<
    Array<{ id: string; qty: string; code: string; currentQty: number }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && items.length > 0) {
      setUpdates(
        items.map((item) => ({
          id: item._id,
          qty: item.qty.toString(),
          code: item.code,
          currentQty: item.qty,
        }))
      );
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Bulk Stock Update</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Qty
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  New Qty
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {updates.map((update, index) => (
                <tr key={update.id}>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">
                    {update.code}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {items.find((item) => item._id === update.id)?.name}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {update.currentQty}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={update.qty}
                      onChange={(e) => {
                        const newUpdates = [...updates];
                        newUpdates[index].qty = e.target.value;
                        setUpdates(newUpdates);
                      }}
                      className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                await onSubmit(updates.map((u) => ({ id: u.id, qty: u.qty })));
                onClose();
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {loading ? "Updating..." : "Update All"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function StockItemsPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [modalType, setModalType] = useState<"create" | "edit">("create");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [isActive, setIsActive] = useState<string>("true");
  const [modalLoading, setModalLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalQty: 0,
    totalValue: 0,
    formattedTotalValue: "",
    averageCost: 0,
    formattedAverageCost: "",
    lowStockCount: 0,
    highStockCount: 0,
  });

  // Fetch stock items
  const fetchStockItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (stockStatus) params.set("stockStatus", stockStatus);
      if (isActive) params.set("isActive", isActive);

      const response = await fetch(`/api/stock-item?${params}`);
      const data = await response.json();

      if (data.success) {
        setStockItems(data.data);
        setSummary(data.summary);
      } else {
        console.error("Failed to fetch stock items:", data.error);
      }
    } catch (error) {
      console.error("Error fetching stock items:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/supplier");
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  useEffect(() => {
    fetchStockItems();
    fetchSuppliers();
  }, [search, category, stockStatus, isActive]);

  const handleCreate = async (formData: StockItemFormData) => {
    setModalLoading(true);
    try {
      // Convert form data to API format
      const apiData = {
        ...formData,
        qty: parseInt(formData.qty),
        price: {
          cost: parseFloat(formData.price.cost),
          sellingC: parseFloat(formData.price.sellingC),
          VAT: parseFloat(formData.price.VAT),
        },
        priceCategory: {
          sellingA: formData.priceCategory.sellingA
            ? parseFloat(formData.priceCategory.sellingA)
            : undefined,
          sellingB: formData.priceCategory.sellingB
            ? parseFloat(formData.priceCategory.sellingB)
            : undefined,
          sellingD: formData.priceCategory.sellingD
            ? parseFloat(formData.priceCategory.sellingD)
            : undefined,
          sellingE: formData.priceCategory.sellingE
            ? parseFloat(formData.priceCategory.sellingE)
            : undefined,
        },
        stockLevel: {
          minStockLevel: parseInt(formData.stockLevel.minStockLevel),
          maxStockLevel: parseInt(formData.stockLevel.maxStockLevel),
        },
        dimensions: formData.dimensions
          ? formData.dimensions
              .split(",")
              .map((d) => d.trim())
              .filter((d) => d)
          : [],
      };

      const response = await fetch("/api/stock-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || data.details || "Failed to create stock item");
        if (data.missingFields) {
          alert(`Missing fields: ${data.missingFields.join(", ")}`);
        }
        return;
      }

      setModalOpen(false);
      fetchStockItems(); // Refresh list
    } catch (error: any) {
      alert(error.message || "Failed to create stock item");
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdate = async (formData: StockItemFormData) => {
    if (!selectedItem) return;

    setModalLoading(true);
    try {
      const apiData = {
        id: selectedItem._id,
        ...formData,
        qty: parseInt(formData.qty),
        price: {
          cost: parseFloat(formData.price.cost),
          sellingC: parseFloat(formData.price.sellingC),
          VAT: parseFloat(formData.price.VAT),
        },
        priceCategory: {
          sellingA: formData.priceCategory.sellingA
            ? parseFloat(formData.priceCategory.sellingA)
            : undefined,
          sellingB: formData.priceCategory.sellingB
            ? parseFloat(formData.priceCategory.sellingB)
            : undefined,
          sellingD: formData.priceCategory.sellingD
            ? parseFloat(formData.priceCategory.sellingD)
            : undefined,
          sellingE: formData.priceCategory.sellingE
            ? parseFloat(formData.priceCategory.sellingE)
            : undefined,
        },
        stockLevel: {
          minStockLevel: parseInt(formData.stockLevel.minStockLevel),
          maxStockLevel: parseInt(formData.stockLevel.maxStockLevel),
        },
        dimensions: formData.dimensions
          ? formData.dimensions
              .split(",")
              .map((d) => d.trim())
              .filter((d) => d)
          : [],
      };

      const response = await fetch("/api/stock-item", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || data.details || "Failed to update stock item");
        return;
      }

      setModalOpen(false);
      setSelectedItem(null);
      fetchStockItems();
    } catch (error: any) {
      alert(error.message || "Failed to update stock item");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`/api/stock-item?id=${selectedItem._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to delete stock item");
        return;
      }

      setDeleteModalOpen(false);
      setSelectedItem(null);
      fetchStockItems();
    } catch (error: any) {
      alert(error.message || "Failed to delete stock item");
    }
  };

  const handleBulkUpdate = async (
    updates: Array<{ id: string; qty: string }>
  ) => {
    try {
      const response = await fetch("/api/stock-item", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to bulk update");
        return;
      }

      setBulkModalOpen(false);
      fetchStockItems();
    } catch (error: any) {
      alert(error.message || "Failed to bulk update");
    }
  };

  const handleEditClick = (item: StockItem) => {
    setSelectedItem(item);
    setModalType("edit");
    setModalOpen(true);
  };

  const handleDeleteClick = (item: StockItem) => {
    setSelectedItem(item);
    setDeleteModalOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedItem(null);
    setModalType("create");
    setModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearch("");
    setCategory("");
    setStockStatus("");
    setIsActive("true");
  };

  // Get unique categories for filter dropdown
  const categories = Array.from(
    new Set(stockItems.map((item) => item.category).filter(Boolean))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col justify-between sm:flex-row sm:items-center">
            <div>
              <div className="flex">
                <BackArrow />
                <h1 className="text-2xl font-bold text-gray-900">
                  Stock Items
                </h1>
              </div>

              <p className="mt-1 text-gray-600">
                Manage your inventory and stock levels
              </p>
            </div>
            <div className="mt-4 flex space-x-2 sm:mt-0">
              <button
                onClick={() => setBulkModalOpen(true)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={stockItems.length === 0}>
                📝 Bulk Update
              </button>
              <button
                onClick={handleCreateClick}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                ➕ Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-900">
              {summary.totalItems}
            </div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {summary.totalQty}
            </div>
            <div className="text-sm text-gray-600">Total Quantity</div>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {summary.formattedTotalValue}
            </div>
            <div className="text-sm text-gray-600">Total Value</div>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-red-600">
              {summary.lowStockCount}
            </div>
            <div className="text-sm text-gray-600">Low Stock Items</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code, name, description..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">All Status</option>
                <option value="Low">Low Stock</option>
                <option value="Normal">Normal Stock</option>
                <option value="High">High Stock</option>
              </select>
            </div>
            <div>
              <select
                value={isActive}
                onChange={(e) => setIsActive(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">All Items</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Clear Filters
            </button>
          </div>
        </div>

        {/* Stock Items List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-lg bg-gray-200"
              />
            ))}
          </div>
        ) : stockItems.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="text-3xl">📦</div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">
              No stock items found
            </h3>
            <p className="mt-1 text-gray-600">
              {search || category || stockStatus || isActive !== "true"
                ? "Try adjusting your filters"
                : "Get started by adding your first stock item"}
            </p>
            <button
              onClick={handleCreateClick}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Add First Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stockItems.map((item) => (
              <StockItemCard
                key={item._id}
                item={item}
                onEdit={() => handleEditClick(item)}
                onDelete={() => handleDeleteClick(item)}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        <StockItemModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedItem(null);
          }}
          onSubmit={modalType === "create" ? handleCreate : handleUpdate}
          title={
            modalType === "create" ? "Add New Stock Item" : "Edit Stock Item"
          }
          initialData={
            modalType === "edit" && selectedItem
              ? {
                  code: selectedItem.code,
                  name: selectedItem.name,
                  qty: selectedItem.qty.toString(),
                  category: selectedItem.category || "",
                  description: selectedItem.description || "",
                  dimensions: selectedItem.dimensions?.join(", ") || "",
                  supplier: selectedItem.supplier?._id || "",
                  price: {
                    cost: selectedItem.price.cost.toString(),
                    sellingC: selectedItem.price.sellingC.toString(),
                    VAT: selectedItem.price.VAT.toString(),
                  },
                  priceCategory: {
                    sellingA:
                      selectedItem.priceCategory?.sellingA?.toString() || "",
                    sellingB:
                      selectedItem.priceCategory?.sellingB?.toString() || "",
                    sellingD:
                      selectedItem.priceCategory?.sellingD?.toString() || "",
                    sellingE:
                      selectedItem.priceCategory?.sellingE?.toString() || "",
                  },
                  stockLevel: {
                    minStockLevel:
                      selectedItem.stockLevel.minStockLevel.toString(),
                    maxStockLevel:
                      selectedItem.stockLevel.maxStockLevel.toString(),
                  },
                  isActive: selectedItem.isActive,
                }
              : undefined
          }
          loading={modalLoading}
          suppliers={suppliers}
        />

        <BulkUpdateModal
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          onSubmit={handleBulkUpdate}
          items={stockItems}
        />

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-bold text-gray-900">
                Delete Stock Item
              </h2>
              <p className="mt-2 text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  {selectedItem.name} ({selectedItem.code})
                </span>
                ?
              </p>
              <p className="mt-2 text-sm text-red-600">
                Note: Item can only be deleted if not used in invoices, quotes,
                workflows, or GRVs. Consider deactivating it instead.
              </p>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setSelectedItem(null);
                  }}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
