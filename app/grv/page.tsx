// app/grv/page.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { z } from "zod";

// Validation schema
const grvItemSchema = z.object({
  stockItem: z.string().min(1, "Stock item is required"),
  qty: z.number().min(1, "Quantity must be at least 1"),
  costPrice: z.number().min(0, "Cost price cannot be negative"),
  sellPrice: z.number().min(0, "Sell price cannot be negative"),
});

const grvSchema = z.object({
  GRVReference: z.string().min(1, "GRV reference is required"),
  orderNumber: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  supplier: z.string().min(1, "Supplier is required"),
  notes: z.string().optional(),
  itemsReceived: z.array(grvItemSchema).min(1, "At least one item is required"),
});

type GRVItem = {
  _id?: string;
  stockItem: string;
  stockItemDetails?: {
    _id: string;
    code: string;
    name: string;
    category: string;
  };
  qty: number;
  costPrice: number;
  sellPrice: number;
};

type GRV = {
  _id: string;
  GRVReference: string;
  orderNumber?: string;
  date: string;
  supplier: {
    _id: string;
    name: string;
    code: string;
  };
  notes?: string;
  itemsReceived: GRVItem[];
  totalQty: number;
  totalCost: number;
  totalValue: number;
  created_at: string;
};

type Supplier = {
  _id: string;
  name: string;
  code: string;
};

type StockItem = {
  _id: string;
  code: string;
  name: string;
  category: string;
  qty: number;
  price: {
    cost: number;
    sellingC: number;
  };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export default function GRVPage() {
  const [grvs, setGrvs] = useState<GRV[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGRV, setSelectedGRV] = useState<GRV | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    GRVReference: "",
    orderNumber: "",
    date: format(new Date(), "yyyy-MM-dd"),
    supplier: "",
    notes: "",
    itemsReceived: [] as GRVItem[],
  });

  // Toast notification system
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50 ${
      type === "success"
        ? "bg-green-500 text-white"
        : type === "error"
        ? "bg-red-500 text-white"
        : "bg-blue-500 text-white"
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  // Fetch GRVs
  const fetchGRVs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: "date",
        sortOrder: "desc",
      });

      if (searchTerm) params.append("search", searchTerm);
      if (supplierFilter) params.append("supplier", supplierFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/grv?${params}`);
      const data = await response.json();

      if (data.success) {
        setGrvs(data.data);
        setPagination(data.pagination);
      } else {
        showToast("Failed to fetch GRVs", "error");
      }
    } catch (error) {
      showToast("Error fetching GRVs", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch suppliers and stock items
  const fetchDropdownData = async () => {
    try {
      // Fetch suppliers
      const suppliersRes = await fetch("/api/suppliers");
      const suppliersData = await suppliersRes.json();
      if (suppliersData.success) {
        setSuppliers(suppliersData.data);
      }

      // Fetch stock items
      const stockRes = await fetch("/api/stock");
      const stockData = await stockRes.json();
      if (stockData.success) {
        setStockItems(stockData.data);
      }
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  useEffect(() => {
    fetchGRVs();
    fetchDropdownData();
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    supplierFilter,
    startDate,
    endDate,
  ]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Form handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // GRV Item handlers
  const addGRVItem = () => {
    setFormData((prev) => ({
      ...prev,
      itemsReceived: [
        ...prev.itemsReceived,
        { stockItem: "", qty: 1, costPrice: 0, sellPrice: 0 },
      ],
    }));
  };

  const updateGRVItem = (
    index: number,
    field: keyof GRVItem,
    value: string | number
  ) => {
    setFormData((prev) => {
      const updatedItems = [...prev.itemsReceived];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };

      // Auto-populate prices when stock item is selected
      if (field === "stockItem" && typeof value === "string") {
        const selectedItem = stockItems.find((item) => item._id === value);
        if (selectedItem) {
          updatedItems[index].costPrice = selectedItem.price.cost;
          updatedItems[index].sellPrice = selectedItem.price.sellingC;
        }
      }

      return { ...prev, itemsReceived: updatedItems };
    });
  };

  const removeGRVItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      itemsReceived: prev.itemsReceived.filter((_, i) => i !== index),
    }));
  };

  // Submit handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate form data
      const validatedData = grvSchema.parse({
        ...formData,
        itemsReceived: formData.itemsReceived.map((item) => ({
          ...item,
          qty: Number(item.qty),
          costPrice: Number(item.costPrice),
          sellPrice: Number(item.sellPrice),
        })),
      });

      const response = await fetch("/api/grv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedData),
      });

      const data = await response.json();

      if (data.success) {
        showToast("GRV created successfully", "success");
        setIsAddModalOpen(false);
        resetForm();
        fetchGRVs();
      } else {
        showToast(data.error || "Failed to create GRV", "error");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err: any) => {
          showToast(err.message, "error");
        });
      } else {
        showToast("Error creating GRV", "error");
      }
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGRV) return;

    try {
      const validatedData = grvSchema.parse({
        ...formData,
        itemsReceived: formData.itemsReceived.map((item) => ({
          ...item,
          qty: Number(item.qty),
          costPrice: Number(item.costPrice),
          sellPrice: Number(item.sellPrice),
        })),
      });

      const response = await fetch("/api/grv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedGRV._id,
          ...validatedData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast("GRV updated successfully", "success");
        setIsEditModalOpen(false);
        resetForm();
        fetchGRVs();
      } else {
        showToast(data.error || "Failed to update GRV", "error");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err: any) => {
          showToast(err.message, "error");
        });
      } else {
        showToast("Error updating GRV", "error");
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedGRV) return;

    try {
      const response = await fetch(`/api/grv?id=${selectedGRV._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        showToast("GRV deleted successfully", "success");
        setIsDeleteDialogOpen(false);
        fetchGRVs();
      } else {
        showToast(data.error || "Failed to delete GRV", "error");
      }
    } catch (error) {
      showToast("Error deleting GRV", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      GRVReference: "",
      orderNumber: "",
      date: format(new Date(), "yyyy-MM-dd"),
      supplier: "",
      notes: "",
      itemsReceived: [],
    });
    setSelectedGRV(null);
  };

  const openEditModal = (grv: GRV) => {
    setSelectedGRV(grv);
    setFormData({
      GRVReference: grv.GRVReference,
      orderNumber: grv.orderNumber || "",
      date: format(new Date(grv.date), "yyyy-MM-dd"),
      supplier: grv.supplier._id,
      notes: grv.notes || "",
      itemsReceived: grv.itemsReceived.map((item) => ({
        stockItem:
          typeof item.stockItem === "string"
            ? item.stockItem
            : (item.stockItem as any)._id,
        qty: item.qty,
        costPrice: item.costPrice,
        sellPrice: item.sellPrice,
      })),
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (grv: GRV) => {
    setSelectedGRV(grv);
    setIsDeleteDialogOpen(true);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  // Modal content component
  const GRVModalContent = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="GRVReference"
            className="block text-sm font-medium text-gray-700">
            GRV Reference *
          </label>
          <input
            id="GRVReference"
            name="GRVReference"
            value={formData.GRVReference}
            onChange={handleInputChange}
            placeholder="GRV202412001"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="orderNumber"
            className="block text-sm font-medium text-gray-700">
            Order Number
          </label>
          <input
            id="orderNumber"
            name="orderNumber"
            value={formData.orderNumber}
            onChange={handleInputChange}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700">
            Date *
          </label>
          <input
            id="date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="supplier"
            className="block text-sm font-medium text-gray-700">
            Supplier *
          </label>
          <select
            id="supplier"
            value={formData.supplier}
            onChange={(e) => handleSelectChange("supplier", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.code} - {supplier.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          placeholder="Additional notes..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Items Received *
          </label>
          <button
            type="button"
            onClick={addGRVItem}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            + Add Item
          </button>
        </div>

        {formData.itemsReceived.length === 0 ? (
          <div className="text-center py-4 text-gray-500 border rounded-md">
            No items added. Click "Add Item" to start.
          </div>
        ) : (
          <div className="space-y-3">
            {formData.itemsReceived.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-end p-3 border rounded-md">
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-700">
                    Stock Item
                  </label>
                  <select
                    value={item.stockItem}
                    onChange={(e) =>
                      updateGRVItem(index, "stockItem", e.target.value)
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Select item</option>
                    {stockItems.map((stockItem) => (
                      <option key={stockItem._id} value={stockItem._id}>
                        {stockItem.code} - {stockItem.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) =>
                      updateGRVItem(index, "qty", Number(e.target.value))
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.costPrice}
                    onChange={(e) =>
                      updateGRVItem(index, "costPrice", Number(e.target.value))
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Sell Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.sellPrice}
                    onChange={(e) =>
                      updateGRVItem(index, "sellPrice", Number(e.target.value))
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={() => removeGRVItem(index)}
                    className="w-full px-2 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {formData.itemsReceived.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-md">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Items:</span>
                <span className="font-semibold ml-2">
                  {formData.itemsReceived.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Qty:</span>
                <span className="font-semibold ml-2">
                  {formData.itemsReceived.reduce(
                    (sum, item) => sum + item.qty,
                    0
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Cost:</span>
                <span className="font-semibold ml-2">
                  {formatCurrency(
                    formData.itemsReceived.reduce(
                      (sum, item) => sum + item.qty * item.costPrice,
                      0
                    )
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Goods Received Vouchers
            </h1>
            <p className="text-gray-600 mt-1">
              Manage all goods received from suppliers
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            + New GRV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total GRVs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pagination.total}
                </p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <svg
                  className="h-6 w-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    grvs.filter(
                      (g) =>
                        new Date(g.date).getMonth() === new Date().getMonth() &&
                        new Date(g.date).getFullYear() ===
                          new Date().getFullYear()
                    ).length
                  }
                </p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <svg
                  className="h-6 w-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">
                  {grvs.reduce((sum, g) => sum + g.totalQty, 0)}
                </p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <svg
                  className="h-6 w-6 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    grvs.reduce((sum, g) => sum + g.totalValue, 0)
                  )}
                </p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <svg
                  className="h-6 w-6 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search GRVs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                setSearchTerm("");
                setSupplierFilter("");
                setStartDate("");
                setEndDate("");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Clear Filters
            </button>
          </div>
        </div>

        {/* GRVs Table */}
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">GRV List</h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : grvs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No GRVs found. Create your first GRV to get started.
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GRV Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {grvs.map((grv) => (
                      <tr key={grv._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="shrink-0 h-8 w-8 text-blue-500">
                              <svg
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {grv.GRVReference}
                              </div>
                              {grv.orderNumber && (
                                <div className="text-sm text-gray-500">
                                  Order: {grv.orderNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(grv.date), "dd MMM yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {grv.supplier.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {grv.supplier.code}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {grv.totalQty} items
                          </div>
                          <div className="text-sm text-gray-500">
                            {grv.itemsReceived.length} line(s)
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(grv.totalCost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(grv.totalValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Received
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEditModal(grv)}
                              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                              Edit
                            </button>
                            <button
                              onClick={() => openDeleteDialog(grv)}
                              className="px-3 py-1 text-sm text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="px-6 py-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Showing {(pagination.page - 1) * pagination.limit + 1}{" "}
                        to{" "}
                        {Math.min(
                          pagination.page * pagination.limit,
                          pagination.total
                        )}{" "}
                        of {pagination.total} GRVs
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className={`px-3 py-1 text-sm font-medium rounded-md ${
                            pagination.page === 1
                              ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                              : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                          }`}>
                          Previous
                        </button>

                        {Array.from(
                          { length: Math.min(5, pagination.pages) },
                          (_, i) => {
                            let pageNum;
                            if (pagination.pages <= 5) {
                              pageNum = i + 1;
                            } else if (pagination.page <= 3) {
                              pageNum = i + 1;
                            } else if (
                              pagination.page >=
                              pagination.pages - 2
                            ) {
                              pageNum = pagination.pages - 4 + i;
                            } else {
                              pageNum = pagination.page - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-3 py-1 text-sm font-medium rounded-md ${
                                  pagination.page === pageNum
                                    ? "text-white bg-blue-600"
                                    : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                                }`}>
                                {pageNum}
                              </button>
                            );
                          }
                        )}

                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.pages}
                          className={`px-3 py-1 text-sm font-medium rounded-md ${
                            pagination.page === pagination.pages
                              ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                              : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                          }`}>
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsAddModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Create New GRV
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <GRVModalContent />
                      <div className="flex justify-end space-x-2 mt-6">
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          Create GRV
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsEditModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Edit GRV - {selectedGRV?.GRVReference}
                    </h3>
                    <form onSubmit={handleEdit} className="space-y-4">
                      <GRVModalContent isEdit />
                      <div className="flex justify-end space-x-2 mt-6">
                        <button
                          type="button"
                          onClick={() => setIsEditModalOpen(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          Update GRV
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsDeleteDialogOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete GRV
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold">
                          {selectedGRV?.GRVReference}
                        </span>
                        ? This action will revert stock quantities and cannot be
                        undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
