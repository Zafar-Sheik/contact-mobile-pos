// app/invoices/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import BackArrow from "../components/BackArrow";

// Types based on your StockItem model
interface StockItem {
  _id: string;
  code: string;
  name: string;
  qty: number;
  category?: string;
  description?: string;
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
  formattedCost: string;
  formattedSellingC: string;
  stockStatus: "Low" | "Normal" | "High";
  totalValue: number;
  formattedTotalValue: string;
}

interface InvoiceItem {
  stockItem: {
    _id: string;
    code: string;
    name: string;
  };
  qty: number;
  price: number;
  VATRate?: number;
  lineTotal: number;
  vatAmount: number;
  formattedPrice: string;
  formattedLineTotal: string;
}

interface Invoice {
  _id: string;
  number: string;
  date: string;
  formattedDate: string;
  client: {
    _id: string;
    customerCode: string;
    companyName: string;
  };
  type: "VAT" | "non VAT";
  description?: string;
  items: InvoiceItem[];
  totalQty: number;
  totalDue: number;
  vatTotal: number;
  formattedSubTotal: string;
  formattedTotalDue: string;
  formattedVATTotal: string;
  paymentStatus: "Paid" | "Partial" | "Unpaid";
  balance: number;
  formattedBalance: string;
}

interface Client {
  _id: string;
  customerCode: string;
  companyName: string;
  priceCategory: string;
  creditLimit: number;
}

interface InvoiceFormData {
  client: string;
  type: "VAT" | "non VAT";
  description: string;
  items: Array<{
    stockItem: string;
    qty: number;
    price: number;
    VATRate?: number;
  }>;
  date: string;
}

// Main Component
export default function InvoicesPage() {
  // State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Form State
  const [formData, setFormData] = useState<InvoiceFormData>({
    client: "",
    type: "VAT",
    description: "",
    items: [{ stockItem: "", qty: 1, price: 0, VATRate: 15 }],
    date: new Date().toISOString().split("T")[0],
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Fetch data
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (clientFilter) params.set("client", clientFilter);
      if (typeFilter) params.set("type", typeFilter);

      const response = await fetch(`/api/invoice?${params}`);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.data);
      } else {
        console.error("Failed to fetch invoices:", data.error);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [search, clientFilter, typeFilter]);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/client");
      const data = await response.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchStockItems = async () => {
    try {
      const response = await fetch("/api/stock-item?isActive=true");
      const data = await response.json();

      if (data.success) {
        // Filter items that are active
        const availableItems = data.data.filter(
          (item: StockItem) => item.isActive
        );
        setStockItems(availableItems);
      }
    } catch (error) {
      console.error("Error fetching stock items:", error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, [fetchInvoices]);

  useEffect(() => {
    if (showCreateModal || showEditModal) {
      fetchStockItems();
    }
  }, [showCreateModal, showEditModal]);

  // Handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          date: formData.date
            ? new Date(formData.date).toISOString()
            : new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to create invoice");
        if (data.details) {
          alert(data.details.join("\n"));
        }
        return;
      }

      setShowCreateModal(false);
      resetForm();
      fetchInvoices();
      fetchStockItems(); // Refresh stock levels
      alert("Invoice created successfully!");
    } catch (error: any) {
      alert(error.message || "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setEditing(true);

    try {
      const response = await fetch("/api/invoice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedInvoice._id,
          description: formData.description,
          date: formData.date
            ? new Date(formData.date).toISOString()
            : new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to update invoice");
        if (data.details) {
          alert(data.details.join("\n"));
        }
        return;
      }

      setShowEditModal(false);
      resetForm();
      fetchInvoices();
      alert("Invoice updated successfully!");
    } catch (error: any) {
      alert(error.message || "Failed to update invoice");
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInvoice) return;

    try {
      const response = await fetch(`/api/invoice?id=${selectedInvoice._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to delete invoice");
        return;
      }

      setShowDeleteModal(false);
      setSelectedInvoice(null);
      fetchInvoices();
      fetchStockItems(); // Stock quantities will be restored
      alert("Invoice deleted successfully!");
    } catch (error: any) {
      alert(error.message || "Failed to delete invoice");
    }
  };

  const resetForm = () => {
    setFormData({
      client: "",
      type: "VAT",
      description: "",
      items: [{ stockItem: "", qty: 1, price: 0, VATRate: 15 }],
      date: new Date().toISOString().split("T")[0],
    });
    setSelectedClient(null);
  };

  // Open edit modal with invoice data
  const handleEditClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);

    // Parse the date from the formatted date string
    let invoiceDate = new Date().toISOString().split("T")[0];
    if (invoice.formattedDate) {
      // Try to parse the formatted date (assuming format like "12/25/2023")
      const dateParts = invoice.formattedDate.split("/");
      if (dateParts.length === 3) {
        invoiceDate = `${dateParts[2]}-${dateParts[1].padStart(
          2,
          "0"
        )}-${dateParts[0].padStart(2, "0")}`;
      }
    }

    setFormData({
      client: invoice.client._id,
      type: invoice.type,
      description: invoice.description || "",
      items: invoice.items.map((item) => ({
        stockItem: item.stockItem._id,
        qty: item.qty,
        price: item.price,
        VATRate: item.VATRate,
      })),
      date: invoiceDate,
    });

    // Find and set the client
    const client = clients.find((c) => c._id === invoice.client._id);
    setSelectedClient(client || null);

    setShowEditModal(true);
  };

  // Form helpers for create modal
  const handleClientChange = (clientId: string) => {
    setFormData({ ...formData, client: clientId });
    const client = clients.find((c) => c._id === clientId);
    setSelectedClient(client || null);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { stockItem: "", qty: 1, price: 0, VATRate: 15 },
      ],
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (
    index: number,
    field: keyof (typeof formData.items)[0],
    value: any
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // If updating quantity, check stock availability (for create mode only)
    if (field === "qty" && newItems[index].stockItem && !showEditModal) {
      const stockItem = stockItems.find(
        (item) => item._id === newItems[index].stockItem
      );
      if (stockItem && value > stockItem.qty) {
        alert(
          `Warning: Quantity (${value}) exceeds available stock (${stockItem.qty}) for ${stockItem.code}`
        );
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleItemSelect = (index: number, stockItemId: string) => {
    const stockItem = stockItems.find((item) => item._id === stockItemId);
    if (stockItem) {
      let price = stockItem.price.sellingC; // Default to sellingC

      if (selectedClient) {
        const priceCat = selectedClient.priceCategory;
        const priceCatMap = stockItem.priceCategory;

        // Get price based on client's price category
        if (priceCat === "A" && priceCatMap?.sellingA) {
          price = priceCatMap.sellingA;
        } else if (priceCat === "B" && priceCatMap?.sellingB) {
          price = priceCatMap.sellingB;
        } else if (priceCat === "C") {
          price = stockItem.price.sellingC;
        } else if (priceCat === "D" && priceCatMap?.sellingD) {
          price = priceCatMap.sellingD;
        } else if (priceCat === "E" && priceCatMap?.sellingE) {
          price = priceCatMap.sellingE;
        }
      }

      // Check stock availability for the item (for create mode only)
      if (!showEditModal && formData.items[index].qty > stockItem.qty) {
        alert(
          `Warning: Selected quantity (${formData.items[index].qty}) exceeds available stock (${stockItem.qty}) for ${stockItem.code}`
        );
      }

      const updatedItem = {
        stockItem: stockItemId,
        qty: formData.items[index].qty,
        price: price,
        VATRate: formData.type === "VAT" ? stockItem.price.VAT : undefined,
      };

      const newItems = [...formData.items];
      newItems[index] = updatedItem;
      setFormData({ ...formData, items: newItems });
    }
  };

  // Calculate available stock for an item
  const getAvailableStock = (stockItemId: string) => {
    const stockItem = stockItems.find((item) => item._id === stockItemId);
    return stockItem ? stockItem.qty : 0;
  };

  // Check if any items exceed available stock (for create mode only)
  const checkStockAvailability = () => {
    if (showEditModal) return true; // Skip stock check for editing existing invoices

    return formData.items.every((item) => {
      if (!item.stockItem) return true;
      const available = getAvailableStock(item.stockItem);
      return item.qty <= available;
    });
  };

  // Calculations
  const calculateTotals = () => {
    const subTotal = formData.items.reduce(
      (sum, item) => sum + item.qty * item.price,
      0
    );
    const vatTotal =
      formData.type === "VAT"
        ? formData.items.reduce(
            (sum, item) =>
              sum + (item.qty * item.price * (item.VATRate || 15)) / 100,
            0
          )
        : 0;
    const totalDue = subTotal + vatTotal;

    return {
      subTotal,
      vatTotal,
      totalDue,
      formattedSubTotal: subTotal.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      formattedVATTotal: vatTotal.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      formattedTotalDue: totalDue.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
    };
  };

  const totals = calculateTotals();

  // Clear filters
  const handleClearFilters = () => {
    setSearch("");
    setClientFilter("");
    setTypeFilter("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BackArrow />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
              <p className="mt-1 text-gray-600">
                Manage your customer invoices
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:mt-0">
            + New Invoice
          </button>
        </div>

        {/* Simple Filters */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice number..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.customerCode} - {client.companyName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">All Types</option>
                <option value="VAT">VAT</option>
                <option value="non VAT">Non-VAT</option>
              </select>
              <button
                onClick={handleClearFilters}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-gray-200"
              />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="text-4xl">📄</div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">
              No invoices found
            </h3>
            <p className="mt-1 text-gray-600">
              {search
                ? "Try adjusting your search"
                : "Create your first invoice"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice._id}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm cursor-pointer transition-shadow duration-200"
                onClick={() => handleEditClick(invoice)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">
                        {invoice.number}
                      </h3>
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          invoice.paymentStatus === "Paid"
                            ? "bg-green-100 text-green-800"
                            : invoice.paymentStatus === "Partial"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                        {invoice.paymentStatus}
                      </span>
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          invoice.type === "VAT"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                        {invoice.type}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {invoice.client.companyName} • {invoice.formattedDate}
                    </p>

                    {invoice.description && (
                      <p className="mt-2 text-sm text-gray-500">
                        📝 {invoice.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Items:</span>
                        <span className="ml-2 font-medium">
                          {invoice.totalQty}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-2 font-medium">
                          {invoice.formattedTotalDue}
                        </span>
                      </div>
                      {invoice.balance > 0 && (
                        <div>
                          <span className="text-red-500">Balance:</span>
                          <span className="ml-2 font-medium text-red-500">
                            {invoice.formattedBalance}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="ml-4 flex gap-2"
                    onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditClick(invoice)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                      title="Edit">
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setShowDeleteModal(true);
                      }}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      title="Delete">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Invoice Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl my-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Create New Invoice
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Client *
                    </label>
                    <select
                      required
                      value={formData.client}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                      <option value="">Select Client</option>
                      {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.customerCode} - {client.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as "VAT" | "non VAT",
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                      <option value="VAT">VAT Invoice</option>
                      <option value="non VAT">Non-VAT Invoice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={2}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Invoice description..."
                  />
                </div>

                {/* Items Section */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Items</h3>
                    <button
                      type="button"
                      onClick={addItem}
                      className="rounded bg-green-100 px-3 py-1 text-sm text-green-700 hover:bg-green-200">
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div
                        key={index}
                        className="rounded border border-gray-200 p-3">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              Item *
                            </label>
                            <select
                              required
                              value={item.stockItem}
                              onChange={(e) =>
                                handleItemSelect(index, e.target.value)
                              }
                              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                              <option value="">Select Item</option>
                              {stockItems.map((stock) => (
                                <option key={stock._id} value={stock._id}>
                                  {stock.code} - {stock.name} (Stock:{" "}
                                  {stock.qty})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              Qty *
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                required
                                min="1"
                                max={
                                  item.stockItem
                                    ? getAvailableStock(item.stockItem)
                                    : undefined
                                }
                                value={item.qty}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "qty",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                              />
                              {item.stockItem && (
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  / {getAvailableStock(item.stockItem)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              Price *
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "price",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                            />
                          </div>

                          {formData.type === "VAT" && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700">
                                VAT % *
                              </label>
                              <input
                                type="number"
                                required
                                min="0"
                                max="100"
                                step="0.1"
                                value={item.VATRate || 15}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "VATRate",
                                    parseFloat(e.target.value) || 15
                                  )
                                }
                                className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                          )}
                        </div>

                        {item.stockItem && (
                          <div className="mt-2 flex justify-between text-xs text-gray-500">
                            <span>
                              Total: R{(item.qty * item.price).toFixed(2)}
                            </span>
                            {formData.type === "VAT" && (
                              <span>
                                VAT: R
                                {(
                                  (item.qty *
                                    item.price *
                                    (item.VATRate || 15)) /
                                  100
                                ).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}

                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="mt-2 text-xs text-red-600 hover:text-red-800">
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stock Availability Warning */}
                {!checkStockAvailability() && (
                  <div className="rounded-md bg-red-50 p-3">
                    <div className="flex">
                      <span className="text-red-500 mr-2">⚠️</span>
                      <div>
                        <p className="text-sm text-red-700">
                          <strong>Stock Warning:</strong> Some items exceed
                          available stock quantities. Please adjust quantities
                          before creating invoice.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Credit Limit Warning */}
                {selectedClient &&
                  selectedClient.creditLimit > 0 &&
                  totals.totalDue > selectedClient.creditLimit && (
                    <div className="rounded-md bg-yellow-50 p-3">
                      <div className="flex">
                        <span className="text-yellow-500 mr-2">⚠️</span>
                        <div>
                          <p className="text-sm text-yellow-700">
                            <strong>Credit Limit Warning:</strong> Invoice
                            amount ({totals.formattedTotalDue}) exceeds client
                            credit limit of{" "}
                            {selectedClient.creditLimit.toLocaleString(
                              "en-ZA",
                              { style: "currency", currency: "ZAR" }
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Totals */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex justify-between">
                    <div>
                      <div className="text-gray-600">Subtotal:</div>
                      {formData.type === "VAT" && (
                        <div className="text-gray-600">VAT:</div>
                      )}
                      <div className="mt-2 font-semibold text-gray-900">
                        Total Due:
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{totals.formattedSubTotal}</div>
                      {formData.type === "VAT" && (
                        <div>{totals.formattedVATTotal}</div>
                      )}
                      <div className="mt-2 font-semibold text-gray-900">
                        {totals.formattedTotalDue}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      creating ||
                      formData.items.length === 0 ||
                      !formData.client ||
                      !checkStockAvailability()
                    }
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {creating ? "Creating..." : "Create Invoice"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Invoice Modal */}
        {showEditModal && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl my-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Edit Invoice {selectedInvoice.number}
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <form onSubmit={handleEdit} className="space-y-4">
                {/* Basic Info - Date can be edited, client and type are read-only */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Client
                    </label>
                    <div className="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                      {selectedInvoice.client.companyName} (
                      {selectedInvoice.client.customerCode})
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <div className="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                      {selectedInvoice.type} Invoice
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={2}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Invoice description..."
                  />
                </div>

                {/* Items Section (Read-only for existing invoices) */}
                <div>
                  <h3 className="mb-3 font-medium text-gray-900">Items</h3>
                  <div className="space-y-3">
                    {selectedInvoice.items.map((item, index) => (
                      <div
                        key={index}
                        className="rounded border border-gray-200 bg-gray-50 p-3">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              Item
                            </label>
                            <div className="mt-1 text-sm">
                              {item.stockItem.code} - {item.stockItem.name}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              Qty
                            </label>
                            <div className="mt-1 text-sm">{item.qty}</div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              Price
                            </label>
                            <div className="mt-1 text-sm">
                              {item.formattedPrice}
                            </div>
                          </div>

                          {selectedInvoice.type === "VAT" && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700">
                                VAT %
                              </label>
                              <div className="mt-1 text-sm">
                                {item.VATRate || 15}%
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex justify-between text-xs text-gray-500">
                          <span>Total: {item.formattedLineTotal}</span>
                          {selectedInvoice.type === "VAT" && (
                            <span>VAT: R{item.vatAmount.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Note: Items cannot be modified for existing invoices.
                  </p>
                </div>

                {/* Totals */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex justify-between">
                    <div>
                      <div className="text-gray-600">Subtotal:</div>
                      {selectedInvoice.type === "VAT" && (
                        <div className="text-gray-600">VAT:</div>
                      )}
                      <div className="mt-2 font-semibold text-gray-900">
                        Total Due:
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{selectedInvoice.formattedSubTotal}</div>
                      {selectedInvoice.type === "VAT" && (
                        <div>{selectedInvoice.formattedVATTotal}</div>
                      )}
                      <div className="mt-2 font-semibold text-gray-900">
                        {selectedInvoice.formattedTotalDue}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editing}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {editing ? "Updating..." : "Update Invoice"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-bold text-gray-900">
                Delete Invoice
              </h2>
              <p className="mt-2 text-gray-600">
                Delete invoice <strong>{selectedInvoice.number}</strong> for{" "}
                <strong>{selectedInvoice.client.companyName}</strong>?
              </p>
              <div className="mt-4 rounded-md bg-yellow-50 p-3">
                <p className="text-sm text-yellow-700">
                  ⚠️ Stock quantities will be restored. Cannot undo if payments
                  exist.
                </p>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
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
