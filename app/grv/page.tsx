// app/grv/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import BackArrow from "../components/BackArrow";

// Types
interface StockItem {
  _id: string;
  code: string;
  name: string;
  qty: number;
  price: {
    cost: number;
    sellingC: number;
    VAT: number;
  };
}

interface Supplier {
  _id: string;
  supplierCode: string;
  name: string;
}

interface GRVItem {
  _id?: string;
  stockItem: string | StockItem;
  qty: number;
  costPrice: number;
  sellPrice: number;
  itemTotal?: number;
}

interface GRV {
  _id: string;
  GRVReference: string;
  supplier: string | Supplier;
  date: string;
  orderNumber?: string;
  notes?: string;
  pdf?: string;
  itemsReceived: GRVItem[];
  totalQty: number;
  totalCost: number;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}

interface GRVFormData {
  GRVReference?: string;
  supplier: string;
  date: Date;
  orderNumber: string;
  notes: string;
  itemsReceived: GRVItem[];
}

// API URL
const API_URL = "/api/grv";

export default function GRVPage() {
  const router = useRouter();

  // State
  const [grvs, setGrvs] = useState<GRV[]>([]);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(10);

  // Modals
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [selectedGRV, setSelectedGRV] = useState<GRV | null>(null);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState<GRVFormData>({
    supplier: "",
    date: new Date(),
    orderNumber: "",
    notes: "",
    itemsReceived: [
      {
        stockItem: "",
        qty: 1,
        costPrice: 0,
        sellPrice: 0,
      },
    ],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Summary
  const [summary, setSummary] = useState({
    totalDocuments: 0,
    totalQuantity: 0,
    totalCost: 0,
    totalValue: 0,
  });

  // Fetch GRVs
  const fetchGRVs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedSupplier && { supplier: selectedSupplier }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(`${API_URL}?${params}`);
      const data = await response.json();

      if (data.success) {
        setGrvs(data.data);
        setTotalPages(data.pagination.pages);
        setTotalRecords(data.pagination.total);
        setSummary(data.summary);
      } else {
        alert(data.error || "Failed to fetch GRVs");
      }
    } catch (error) {
      alert("Failed to fetch GRVs");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    sortBy,
    sortOrder,
    searchTerm,
    selectedSupplier,
    startDate,
    endDate,
  ]);

  // Fetch suppliers for dropdown
  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/supplier");
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  // Fetch stock items for dropdown
  const fetchStockItems = async () => {
    try {
      const response = await fetch("/api/stock-item?limit=1000");
      const data = await response.json();
      if (data.success) {
        setStockItems(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stock items:", error);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchGRVs();
    fetchSuppliers();
    fetchStockItems();
  }, [fetchGRVs]);

  // Handle sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.supplier) {
      newErrors.supplier = "Supplier is required";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    formData.itemsReceived.forEach((item, index) => {
      if (!item.stockItem) {
        newErrors[`items[${index}].stockItem`] = "Stock item is required";
      }
      if (item.qty < 1) {
        newErrors[`items[${index}].qty`] = "Quantity must be at least 1";
      }
      if (item.costPrice < 0) {
        newErrors[`items[${index}].costPrice`] =
          "Cost price cannot be negative";
      }
      if (item.sellPrice < 0) {
        newErrors[`items[${index}].sellPrice`] =
          "Sell price cannot be negative";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create GRV
  const handleCreate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          date: format(formData.date, "yyyy-MM-dd"),
          itemsReceived: formData.itemsReceived.map((item) => ({
            stockItem: item.stockItem,
            qty: item.qty,
            costPrice: item.costPrice,
            sellPrice: item.sellPrice,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("GRV created successfully");
        setCreateModalOpened(false);
        resetForm();
        fetchGRVs();
      } else {
        alert(data.error || "Failed to create GRV");
      }
    } catch (error) {
      alert("Failed to create GRV");
    } finally {
      setLoading(false);
    }
  };

  // Update GRV
  const handleUpdate = async () => {
    if (!selectedGRV || !validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedGRV._id,
          ...formData,
          date: format(formData.date, "yyyy-MM-dd"),
          itemsReceived: formData.itemsReceived.map((item) => ({
            stockItem: item.stockItem,
            qty: item.qty,
            costPrice: item.costPrice,
            sellPrice: item.sellPrice,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("GRV updated successfully");
        setEditModalOpened(false);
        setSelectedGRV(null);
        resetForm();
        fetchGRVs();
      } else {
        alert(data.error || "Failed to update GRV");
      }
    } catch (error) {
      alert("Failed to update GRV");
    } finally {
      setLoading(false);
    }
  };

  // Delete GRV
  const handleDelete = async () => {
    if (!selectedGRV) return;

    if (
      !confirm(
        `Are you sure you want to delete GRV ${selectedGRV.GRVReference}? This action will revert stock quantities and cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?id=${selectedGRV._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        alert("GRV deleted successfully");
        setDeleteModalOpened(false);
        setSelectedGRV(null);
        fetchGRVs();
      } else {
        alert(data.error || "Failed to delete GRV");
      }
    } catch (error) {
      alert("Failed to delete GRV");
    } finally {
      setLoading(false);
    }
  };

  // Edit GRV
  const handleEdit = (grv: GRV) => {
    setSelectedGRV(grv);
    setFormData({
      supplier:
        typeof grv.supplier === "string" ? grv.supplier : grv.supplier._id,
      date: new Date(grv.date),
      orderNumber: grv.orderNumber || "",
      notes: grv.notes || "",
      itemsReceived: grv.itemsReceived.map((item) => ({
        stockItem:
          typeof item.stockItem === "string"
            ? item.stockItem
            : item.stockItem._id,
        qty: item.qty,
        costPrice: item.costPrice,
        sellPrice: item.sellPrice,
      })),
    });
    setEditModalOpened(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      supplier: "",
      date: new Date(),
      orderNumber: "",
      notes: "",
      itemsReceived: [
        {
          stockItem: "",
          qty: 1,
          costPrice: 0,
          sellPrice: 0,
        },
      ],
    });
    setErrors({});
  };

  // Add item row
  const addItemRow = () => {
    setFormData({
      ...formData,
      itemsReceived: [
        ...formData.itemsReceived,
        {
          stockItem: "",
          qty: 1,
          costPrice: 0,
          sellPrice: 0,
        },
      ],
    });
  };

  // Remove item row
  const removeItemRow = (index: number) => {
    if (formData.itemsReceived.length > 1) {
      const newItems = [...formData.itemsReceived];
      newItems.splice(index, 1);
      setFormData({ ...formData, itemsReceived: newItems });
    }
  };

  // Update form field
  const updateFormField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  // Update item field
  const updateItemField = (index: number, field: string, value: any) => {
    const newItems = [...formData.itemsReceived];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, itemsReceived: newItems });

    const errorKey = `items[${index}].${field}`;
    if (errors[errorKey]) {
      setErrors({ ...errors, [errorKey]: "" });
    }
  };

  // Calculate item totals
  const calculateItemTotal = (item: GRVItem) => {
    return item.qty * item.costPrice;
  };

  // Calculate form totals
  const calculateFormTotals = () => {
    const items = formData.itemsReceived;
    const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
    const totalCost = items.reduce(
      (sum, item) => sum + calculateItemTotal(item),
      0
    );
    const totalValue = items.reduce(
      (sum, item) => sum + (item.qty * item.sellPrice || 0),
      0
    );

    return { totalQty, totalCost, totalValue };
  };

  // Toggle row expansion
  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        limit: "10000",
        ...(selectedSupplier && { supplier: selectedSupplier }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(`${API_URL}?${params}`);
      const data = await response.json();

      if (data.success) {
        const csvContent = convertToCSV(data.data);
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `grv_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert("Failed to export GRVs");
    }
  };

  const convertToCSV = (data: GRV[]) => {
    const headers = [
      "GRV Reference",
      "Date",
      "Supplier",
      "Order Number",
      "Total Qty",
      "Total Cost",
      "Total Value",
      "Notes",
    ];
    const rows = data.map((grv) => [
      grv.GRVReference,
      format(new Date(grv.date), "yyyy-MM-dd"),
      typeof grv.supplier === "string" ? grv.supplier : grv.supplier.name,
      grv.orderNumber || "",
      grv.totalQty,
      grv.totalCost,
      grv.totalValue,
      grv.notes || "",
    ]);

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSupplier(null);
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  // Get supplier name
  const getSupplierName = (supplier: string | Supplier) => {
    if (typeof supplier === "string") {
      const foundSupplier = suppliers.find((s) => s._id === supplier);
      return foundSupplier
        ? `${foundSupplier.supplierCode} - ${foundSupplier.name}`
        : "Loading...";
    }
    return `${supplier.supplierCode} - ${supplier.name}`;
  };

  // Get stock item info
  const getStockItemInfo = (stockItem: string | StockItem) => {
    if (typeof stockItem === "string") {
      const foundItem = stockItems.find((s) => s._id === stockItem);
      return foundItem
        ? { code: foundItem.code, name: foundItem.name }
        : { code: "Loading...", name: "Loading..." };
    }
    return { code: stockItem.code, name: stockItem.name };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded">Loading...</div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <BackArrow />
          <div>
            <h1 className="text-2xl font-bold">Goods Received Vouchers</h1>
            <p className="text-gray-600">
              Manage incoming stock from suppliers
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-2">
            Export CSV
          </button>
          <button
            onClick={() => {
              setSelectedGRV(null);
              resetForm();
              setCreateModalOpened(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md flex items-center gap-2">
            + New GRV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">
                Total GRVs
              </p>
              <p className="text-2xl font-bold">{summary.totalDocuments}</p>
            </div>
            <div className="text-blue-600">📄</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">
                Total Quantity
              </p>
              <p className="text-2xl font-bold">
                {summary.totalQuantity.toLocaleString()}
              </p>
            </div>
            <div className="text-green-600">📦</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">
                Total Cost
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.totalCost)}
              </p>
            </div>
            <div className="text-orange-600">💰</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">
                Total Value
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.totalValue)}
              </p>
            </div>
            <div className="text-purple-600">🏭</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Filters</h2>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-800">
            Clear Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search GRV reference, order number, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedSupplier || ""}
            onChange={(e) => setSelectedSupplier(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.supplierCode} - {supplier.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* GRV Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("GRVReference")}>
                  GRV Reference
                  {sortBy === "GRVReference" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("date")}>
                  Date
                  {sortBy === "date" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grvs.map((grv) => {
                const isExpanded = expandedRows.includes(grv._id);
                return (
                  <React.Fragment key={grv._id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleRowExpansion(grv._id)}
                            className="text-gray-500 hover:text-gray-700">
                            {isExpanded ? "↑" : "↓"}
                          </button>
                          <span className="font-medium">
                            {grv.GRVReference}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {format(new Date(grv.date), "dd MMM yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getSupplierName(grv.supplier)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {grv.orderNumber || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {grv.totalQty.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatCurrency(grv.totalCost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatCurrency(grv.totalValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(grv)}
                            className="px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-sm">
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedGRV(grv);
                              if (confirm(`Delete GRV ${grv.GRVReference}?`)) {
                                handleDelete();
                              }
                            }}
                            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm">
                            Delete
                          </button>
                          {grv.pdf && (
                            <a
                              href={grv.pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-sm">
                              PDF
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-gray-50">
                          <div className="mb-4">
                            <h3 className="font-semibold mb-2">
                              Items Received:
                            </h3>
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead>
                                <tr>
                                  <th className="px-4 py-2 text-left text-sm">
                                    Item Code
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm">
                                    Item Name
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm">
                                    Quantity
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm">
                                    Cost Price
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm">
                                    Sell Price
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm">
                                    Total Cost
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm">
                                    Total Value
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {grv.itemsReceived.map((item, index) => {
                                  const stockInfo = getStockItemInfo(
                                    item.stockItem
                                  );
                                  return (
                                    <tr
                                      key={index}
                                      className="hover:bg-gray-100">
                                      <td className="px-4 py-2">
                                        {stockInfo.code}
                                      </td>
                                      <td className="px-4 py-2">
                                        {stockInfo.name}
                                      </td>
                                      <td className="px-4 py-2">
                                        {item.qty.toLocaleString()}
                                      </td>
                                      <td className="px-4 py-2">
                                        {formatCurrency(item.costPrice)}
                                      </td>
                                      <td className="px-4 py-2">
                                        {formatCurrency(item.sellPrice)}
                                      </td>
                                      <td className="px-4 py-2">
                                        {formatCurrency(
                                          item.qty * item.costPrice
                                        )}
                                      </td>
                                      <td className="px-4 py-2">
                                        {formatCurrency(
                                          item.qty * item.sellPrice
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {grv.notes && (
                            <div>
                              <h3 className="font-semibold mb-1">Notes:</h3>
                              <p className="text-gray-700">{grv.notes}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalRecords)} of {totalRecords} records
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50">
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 border rounded ${
                        page === pageNum
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-300"
                      }`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(createModalOpened || editModalOpened) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editModalOpened ? "Edit" : "Create"} GRV
                </h2>
                <button
                  onClick={() => {
                    setCreateModalOpened(false);
                    setEditModalOpened(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier *
                    </label>
                    <select
                      value={formData.supplier}
                      onChange={(e) =>
                        updateFormField("supplier", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.supplier ? "border-red-500" : "border-gray-300"
                      }`}>
                      <option value="">Select supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier._id} value={supplier._id}>
                          {supplier.supplierCode} - {supplier.name}
                        </option>
                      ))}
                    </select>
                    {errors.supplier && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.supplier}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={format(formData.date, "yyyy-MM-dd")}
                      onChange={(e) =>
                        updateFormField("date", new Date(e.target.value))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.date ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.date && (
                      <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Number
                  </label>
                  <input
                    type="text"
                    value={formData.orderNumber}
                    onChange={(e) =>
                      updateFormField("orderNumber", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional order number"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-3">Items Received *</h3>
                  {formData.itemsReceived.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stock Item *
                          </label>
                          <select
                            value={item.stockItem as string}
                            onChange={(e) =>
                              updateItemField(
                                index,
                                "stockItem",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`items[${index}].stockItem`]
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}>
                            <option value="">Select item</option>
                            {stockItems.map((stockItem) => (
                              <option key={stockItem._id} value={stockItem._id}>
                                {stockItem.code} - {stockItem.name} (Stock:{" "}
                                {stockItem.qty})
                              </option>
                            ))}
                          </select>
                          {errors[`items[${index}].stockItem`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors[`items[${index}].stockItem`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              updateItemField(
                                index,
                                "qty",
                                parseInt(e.target.value)
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`items[${index}].qty`]
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                          {errors[`items[${index}].qty`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors[`items[${index}].qty`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cost Price *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.costPrice}
                            onChange={(e) =>
                              updateItemField(
                                index,
                                "costPrice",
                                parseFloat(e.target.value)
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`items[${index}].costPrice`]
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                          {errors[`items[${index}].costPrice`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors[`items[${index}].costPrice`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sell Price *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.sellPrice}
                            onChange={(e) =>
                              updateItemField(
                                index,
                                "sellPrice",
                                parseFloat(e.target.value)
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`items[${index}].sellPrice`]
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                          {errors[`items[${index}].sellPrice`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors[`items[${index}].sellPrice`]}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                          Item Total: {formatCurrency(calculateItemTotal(item))}
                        </p>
                        {formData.itemsReceived.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 hover:bg-gray-50">
                    + Add Another Item
                  </button>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Quantity</p>
                      <p className="text-2xl font-bold">
                        {calculateFormTotals().totalQty}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Cost</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(calculateFormTotals().totalCost)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Value</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(calculateFormTotals().totalValue)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => updateFormField("notes", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes (optional)"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpened(false);
                      setEditModalOpened(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={editModalOpened ? handleUpdate : handleCreate}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                    {loading
                      ? "Processing..."
                      : editModalOpened
                      ? "Update GRV"
                      : "Create GRV"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
