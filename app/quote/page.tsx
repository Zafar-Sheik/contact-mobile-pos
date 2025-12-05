// app/quotes/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Share2,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  FileText,
  Download,
  Calendar,
  DollarSign,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Users,
  Printer,
  Mail,
  X,
  Check,
  ArrowLeft,
  ArrowRight,
  Grid,
  List,
  Percent,
  Building,
  Mail as MailIcon,
  Tag,
  Settings,
  HelpCircle,
  Menu,
} from "lucide-react";
import BackArrow from "../components/BackArrow";

// Types matching stock-item API
interface StockItem {
  _id: string;
  code: string;
  name: string;
  category: string;
  qty: number;
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
  stockStatus: "Low" | "Normal" | "High";
  formattedCost: string;
  formattedSellingC: string;
  totalValue: number;
  formattedTotalValue: string;
}

interface QuoteItem {
  _id: string;
  stockItem: StockItem;
  qty: number;
  price: number;
  VATRate: number;
  lineTotal: number;
  vatAmount: number;
  total: number;
  formattedPrice: string;
  formattedLineTotal: string;
  formattedVATAmount: string;
  formattedTotal: string;
}

interface Client {
  _id: string;
  customerCode: string;
  companyName: string;
  owner: string;
  address: string;
  cellNo: string;
  email: string;
  priceCategory: string;
}

interface Quote {
  _id: string;
  number: string;
  date: string;
  formattedDate: string;
  client: Client;
  description?: string;
  quoteItems: QuoteItem[];
  subTotal: number;
  vatTotal: number;
  totalDue: number;
  totalQty: number;
  formattedSubTotal: string;
  formattedVATTotal: string;
  formattedTotalDue: string;
  status: "Active" | "Expired" | "Converted";
  daysValid: number;
  convertedToInvoice?: boolean;
  invoiceReference?: string;
}

// Modal Components
const CreateQuoteModal = ({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingStock, setFetchingStock] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [formData, setFormData] = useState({
    client: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    quoteItems: [] as Array<{
      stockItem: string;
      qty: number;
      price: number;
      VATRate: number;
    }>,
  });
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [itemQty, setItemQty] = useState("1");
  const [searchTerm, setSearchTerm] = useState("");
  const [stockSearchTerm, setStockSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchStockItems();
    }
  }, [isOpen]);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/client?limit=100");
      const data = await response.json();
      if (data.success) setClients(data.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchStockItems = async () => {
    try {
      setFetchingStock(true);
      const queryParams = new URLSearchParams({
        limit: "100",
        isActive: "true",
        ...(stockSearchTerm && { search: stockSearchTerm }),
      });

      const response = await fetch(`/api/stock-item?${queryParams}`);
      const data = await response.json();
      if (data.success) {
        setStockItems(data.data);
      }
    } catch (error) {
      console.error("Error fetching stock items:", error);
    } finally {
      setFetchingStock(false);
    }
  };

  useEffect(() => {
    if (stockSearchTerm) {
      const debounceTimer = setTimeout(() => {
        fetchStockItems();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [stockSearchTerm]);

  const selectedClient = clients.find((c) => c._id === formData.client);

  const handleAddItem = () => {
    if (!selectedItem) return;

    const price = getPriceForClient(
      selectedClient?.priceCategory || "C",
      selectedItem
    );
    const vatRate = selectedItem.price.VAT || 15;

    setFormData((prev) => ({
      ...prev,
      quoteItems: [
        ...prev.quoteItems,
        {
          stockItem: selectedItem._id,
          qty: parseInt(itemQty) || 1,
          price: price,
          VATRate: vatRate,
        },
      ],
    }));

    setSelectedItem(null);
    setItemQty("1");
    setStockSearchTerm("");
  };

  const getPriceForClient = (priceCategory: string, item: StockItem) => {
    switch (priceCategory) {
      case "A":
        return item.priceCategory?.sellingA || item.price.sellingC;
      case "B":
        return item.priceCategory?.sellingB || item.price.sellingC;
      case "C":
        return item.price.sellingC;
      case "D":
        return item.priceCategory?.sellingD || item.price.sellingC;
      case "E":
        return item.priceCategory?.sellingE || item.price.sellingC;
      default:
        return item.price.sellingC;
    }
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      quoteItems: prev.quoteItems.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const subTotal = formData.quoteItems.reduce(
      (sum, item) => sum + item.qty * item.price,
      0
    );
    const vatTotal = formData.quoteItems.reduce(
      (sum, item) => sum + (item.qty * item.price * item.VATRate) / 100,
      0
    );
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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
        resetForm();
      } else {
        alert(data.error || "Failed to create quote");
      }
    } catch (error) {
      console.error("Error creating quote:", error);
      alert("Failed to create quote");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      quoteItems: [],
    });
    setStep(1);
    setStockSearchTerm("");
    setSelectedItem(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b bg-white rounded-t-2xl">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Create New Quote
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((num) => (
                    <div
                      key={num}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step === num
                          ? "bg-blue-600 text-white"
                          : step > num
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}>
                      {step > num ? <Check className="w-4 h-4" /> : num}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-gray-600 ml-2">
                  Step {step} of 3
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Step 1: Client Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Select Client
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clients.map((client) => (
                      <div
                        key={client._id}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            client: client._id,
                          }))
                        }
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          formData.client === client._id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-gray-500" />
                              <h4 className="font-medium text-gray-900">
                                {client.companyName}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {client.owner}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {client.customerCode}
                              </span>
                              <span className="flex items-center gap-1">
                                <Percent className="w-3 h-3" />
                                Price Cat: {client.priceCategory}
                              </span>
                            </div>
                          </div>
                          {formData.client === client._id && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {formData.client && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          Selected Client
                        </p>
                        <p className="text-sm text-gray-600">
                          {
                            clients.find((c) => c._id === formData.client)
                              ?.companyName
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => setStep(2)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Continue to Items
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Add Items */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Add Items
                    </h3>
                    <div className="text-sm text-gray-600">
                      {formData.quoteItems.length} items added
                    </div>
                  </div>

                  {/* Search and Add Item */}
                  <div className="bg-gray-50 p-4 rounded-xl mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Search Stock Items
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            value={stockSearchTerm}
                            onChange={(e) => setStockSearchTerm(e.target.value)}
                            placeholder="Search by code or name..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                          />
                          {fetchingStock && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={itemQty}
                          onChange={(e) => setItemQty(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Stock Items Grid */}
                    <div className="max-h-60 overflow-y-auto">
                      {fetchingStock ? (
                        <div className="flex justify-center items-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      ) : stockItems.length === 0 ? (
                        <div className="text-center py-8">
                          <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No stock items found</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {stockItems.map((item) => {
                            const price = getPriceForClient(
                              selectedClient?.priceCategory || "C",
                              item
                            );
                            const stockStatusColor =
                              item.stockStatus === "Low"
                                ? "text-red-600"
                                : item.stockStatus === "High"
                                ? "text-green-600"
                                : "text-gray-600";

                            return (
                              <div
                                key={item._id}
                                onClick={() => setSelectedItem(item)}
                                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                  selectedItem?._id === item._id
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}>
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      {item.name}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Code: {item.code}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <div className="text-sm font-medium text-green-600">
                                        {price.toLocaleString("en-ZA", {
                                          style: "currency",
                                          currency: "ZAR",
                                        })}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`text-xs ${stockStatusColor}`}>
                                          {item.qty} in stock
                                        </span>
                                        {item.stockStatus === "Low" && (
                                          <AlertCircle className="w-3 h-3 text-red-500" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {selectedItem?._id === item._id && (
                                    <Check className="w-5 h-5 text-blue-600 ml-2" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAddItem}
                      disabled={!selectedItem}
                      className="mt-4 w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5" />
                      Add Selected Item
                    </button>
                  </div>

                  {/* Added Items */}
                  {formData.quoteItems.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Added Items</h4>
                      {formData.quoteItems.map((item, index) => {
                        const stockItem = stockItems.find(
                          (s) => s._id === item.stockItem
                        );
                        if (!stockItem) return null;

                        const lineTotal = item.qty * item.price;
                        const vatAmount = (lineTotal * item.VATRate) / 100;

                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">
                                {stockItem.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {item.qty} ×{" "}
                                {item.price.toLocaleString("en-ZA", {
                                  style: "currency",
                                  currency: "ZAR",
                                })}
                                ={" "}
                                {(item.qty * item.price).toLocaleString(
                                  "en-ZA",
                                  { style: "currency", currency: "ZAR" }
                                )}
                                <span className="ml-3 text-xs text-gray-500">
                                  VAT: {item.VATRate}%
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {(lineTotal + vatAmount).toLocaleString(
                                  "en-ZA",
                                  { style: "currency", currency: "ZAR" }
                                )}
                              </span>
                              <button
                                onClick={() => handleRemoveItem(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Clients
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={formData.quoteItems.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    Continue to Review
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review and Submit */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Review Quote
                </h3>

                {/* Client and Date Info */}
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Client</p>
                      <p className="font-medium">
                        {selectedClient?.companyName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">{formData.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Price Category</p>
                      <p className="font-medium">
                        {selectedClient?.priceCategory || "C"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Items Summary</h4>
                  <div className="space-y-3">
                    {formData.quoteItems.map((item, index) => {
                      const stockItem = stockItems.find(
                        (s) => s._id === item.stockItem
                      );
                      if (!stockItem) return null;

                      const lineTotal = item.qty * item.price;
                      const vatAmount = (lineTotal * item.VATRate) / 100;

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{stockItem.name}</div>
                            <div className="text-sm text-gray-600">
                              Code: {stockItem.code} • Qty: {item.qty} • Price:{" "}
                              {item.price.toLocaleString("en-ZA", {
                                style: "currency",
                                currency: "ZAR",
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {(lineTotal + vatAmount).toLocaleString("en-ZA", {
                                style: "currency",
                                currency: "ZAR",
                              })}
                            </div>
                            <div className="text-sm text-gray-600">
                              VAT: {item.VATRate}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 p-4 bg-blue-50 rounded-xl">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">
                      {totals.formattedSubTotal}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT:</span>
                    <span className="font-medium">
                      {totals.formattedVATTotal}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total Due:</span>
                    <span className="text-blue-600">
                      {totals.formattedTotalDue}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Add any notes or description for this quote..."
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Items
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Create Quote
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Quick Stock Item Search Modal Component
const StockItemSearchModal = ({
  isOpen,
  onClose,
  onSelect,
  currentStockItems,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: StockItem) => void;
  currentStockItems: StockItem[];
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStockItems();
    }
  }, [isOpen]);

  const fetchStockItems = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        limit: "50",
        isActive: "true",
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/stock-item?${queryParams}`);
      const data = await response.json();
      if (data.success) {
        // Filter out already selected items
        const currentIds = currentStockItems.map((item) => item._id);
        const filteredItems = data.data.filter(
          (item: StockItem) => !currentIds.includes(item._id)
        );
        setStockItems(filteredItems);
      }
    } catch (error) {
      console.error("Error fetching stock items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm) {
        fetchStockItems();
      }
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b bg-white rounded-t-2xl">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Add Stock Item
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Search and select items to add
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code or name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Stock Items List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : stockItems.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No stock items found</p>
                  {searchTerm && (
                    <p className="text-sm text-gray-400 mt-2">
                      Try a different search term
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {stockItems.map((item) => (
                    <button
                      key={item._id}
                      onClick={() => {
                        onSelect(item);
                        onClose();
                      }}
                      className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            Code: {item.code}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-green-600 font-medium">
                              {item.price.sellingC.toLocaleString("en-ZA", {
                                style: "currency",
                                currency: "ZAR",
                              })}
                            </span>
                            <span className="text-gray-500">
                              Stock: {item.qty} ({item.stockStatus})
                            </span>
                          </div>
                        </div>
                        <Plus className="w-5 h-5 text-blue-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditQuoteModal = ({
  isOpen,
  onClose,
  quote,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  onSuccess: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    quoteItems: [] as Quote["quoteItems"],
  });

  useEffect(() => {
    if (quote && isOpen) {
      setFormData({
        description: quote.description || "",
        quoteItems: quote.quoteItems,
      });
    }
  }, [quote, isOpen]);

  const handleSubmit = async () => {
    if (!quote) return;

    try {
      setLoading(true);
      const response = await fetch("/api/quote", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: quote._id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || "Failed to update quote");
      }
    } catch (error) {
      console.error("Error updating quote:", error);
      alert("Failed to update quote");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !quote) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b bg-white rounded-t-2xl">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Quote</h2>
              <p className="text-sm text-gray-600 mt-1">{quote.number}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="space-y-6">
              {/* Quote Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Client</p>
                    <p className="font-medium">{quote.client.companyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium">{quote.formattedDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          quote.status === "Active"
                            ? "bg-green-500"
                            : quote.status === "Expired"
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                      />
                      <span>{quote.status}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-medium">{quote.formattedTotalDue}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Update quote description..."
                />
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Items ({quote.quoteItems.length})
                </h4>
                <div className="space-y-3">
                  {quote.quoteItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.stockItem.name}</div>
                        <div className="text-sm text-gray-600">
                          Code: {item.stockItem.code} • {item.qty} ×{" "}
                          {item.formattedPrice}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {item.formattedLineTotal}
                        </div>
                        <div className="text-sm text-gray-600">
                          VAT: {item.VATRate}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Update Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickActionsModal = ({
  isOpen,
  onClose,
  quote,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  onSuccess: () => void;
}) => {
  if (!isOpen || !quote) return null;

  const actions = [
    {
      icon: Copy,
      label: "Duplicate Quote",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      action: () => {
        // Implement duplicate
        onClose();
      },
    },
    {
      icon: Printer,
      label: "Print Quote",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      action: () => {
        window.open(`/quotes/print/${quote._id}`, "_blank");
        onClose();
      },
    },
    {
      icon: Mail,
      label: "Email Quote",
      color: "text-green-600",
      bgColor: "bg-green-50",
      action: () => {
        // Implement email
        onClose();
      },
    },
    {
      icon: FileText,
      label: "Convert to Invoice",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      action: () => {
        // Implement convert
        onClose();
      },
    },
    {
      icon: Download,
      label: "Export as PDF",
      color: "text-red-600",
      bgColor: "bg-red-50",
      action: () => {
        // Implement export
        onClose();
      },
    },
    {
      icon: Share2,
      label: "Share Link",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      action: () => {
        // Implement share
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center p-4 sm:items-center">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Quick Actions</h3>
              <button onClick={onClose} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">{quote.number}</p>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`flex flex-col items-center justify-center p-4 ${action.bgColor} rounded-xl hover:opacity-90 transition-opacity`}>
                  <action.icon className={`w-6 h-6 ${action.color} mb-2`} />
                  <span className="text-sm font-medium text-gray-900 text-center">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({
  status,
  daysValid,
}: {
  status: string;
  daysValid: number;
}) => {
  const baseClasses =
    "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";

  switch (status) {
    case "Active":
      return (
        <span className={`${baseClasses} bg-green-100 text-green-800`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          Active ({daysValid}d)
        </span>
      );
    case "Expired":
      return (
        <span className={`${baseClasses} bg-red-100 text-red-800`}>
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </span>
      );
    case "Converted":
      return (
        <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
          <FileText className="w-3 h-3 mr-1" />
          Converted
        </span>
      );
    default:
      return (
        <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
          {status}
        </span>
      );
  }
};

// Mobile Floating Action Button
const FloatingActionButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-6 z-40 md:hidden w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center">
    <Plus className="w-6 h-6" />
  </button>
);

// Main Page Component
export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [showStockSearchModal, setShowStockSearchModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const itemsPerPage = 10;

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: sortField,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== "all" && { status: filterStatus }),
      });

      const response = await fetch(`/api/quote?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setQuotes(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortField, sortOrder, searchTerm, filterStatus]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleRefresh = () => {
    fetchQuotes();
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm("Are you sure you want to delete this quote?")) return;

    try {
      const response = await fetch(`/api/quote?id=${quoteId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        fetchQuotes();
      } else {
        alert(data.error || "Failed to delete quote");
      }
    } catch (error) {
      console.error("Error deleting quote:", error);
      alert("Failed to delete quote");
    }
  };

  const handleOpenEditModal = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowEditModal(true);
  };

  const handleOpenQuickActions = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowQuickActionsModal(true);
  };

  const handleSuccess = () => {
    fetchQuotes();
  };

  const toggleSelectQuote = (quoteId: string) => {
    setSelectedQuotes((prev) =>
      prev.includes(quoteId)
        ? prev.filter((id) => id !== quoteId)
        : [...prev, quoteId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuotes.length === quotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(quotes.map((q) => q._id));
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Mobile optimizations
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode("list");
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Menu */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl transform transition-transform md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Menu</h2>
            <button onClick={() => setIsMobileMenuOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <button className="flex items-center gap-3 w-full p-3 hover:bg-gray-100 rounded-lg">
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>
          <button className="flex items-center gap-3 w-full p-3 hover:bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5" />
            Settings
          </button>
          <button className="flex items-center gap-3 w-full p-3 hover:bg-gray-100 rounded-lg">
            <HelpCircle className="w-5 h-5" />
            Help
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu className="w-5 h-5" />
              </button>
              <BackArrow />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Quotes
                </h1>
                <p className="text-gray-600 text-sm">
                  Manage and track your quotes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="hidden md:flex items-center bg-white border rounded-lg p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded ${
                    viewMode === "list" ? "bg-gray-100" : ""
                  }`}>
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded ${
                    viewMode === "grid" ? "bg-gray-100" : ""
                  }`}>
                  <Grid className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">New Quote</span>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  filterStatus === "all"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                All
              </button>
              <button
                onClick={() => setFilterStatus("Active")}
                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                  filterStatus === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                <CheckCircle className="w-3 h-3" />
                Active
              </button>
              <button
                onClick={() => setFilterStatus("Expired")}
                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                  filterStatus === "Expired"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                <XCircle className="w-3 h-3" />
                Expired
              </button>
              <button
                onClick={() => setFilterStatus("Converted")}
                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                  filterStatus === "Converted"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                <FileText className="w-3 h-3" />
                Converted
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                More Filters
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Panel */}
        {showAnalytics && (
          <div className="mb-6 bg-white rounded-2xl shadow p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Total Quotes</p>
                    <p className="text-xl font-bold">24</p>
                  </div>
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Total Value</p>
                    <p className="text-xl font-bold">R 245,680</p>
                  </div>
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600">Active</p>
                    <p className="text-xl font-bold">18</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-amber-500" />
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600">Conversion Rate</p>
                    <p className="text-xl font-bold">65%</p>
                  </div>
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quotes List/Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading quotes...</p>
            </div>
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No quotes found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by creating your first quote"}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Create Quote
            </button>
          </div>
        ) : viewMode === "grid" ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quotes.map((quote) => (
              <div
                key={quote._id}
                className="bg-white rounded-xl shadow hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {quote.number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {quote.client.companyName}
                      </p>
                    </div>
                    <StatusBadge
                      status={quote.status}
                      daysValid={quote.daysValid}
                    />
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{quote.formattedDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Items:</span>
                      <span className="font-medium">
                        {quote.totalQty} items
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-bold text-blue-600">
                        {quote.formattedTotalDue}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-3 border-t">
                    <button
                      onClick={() => handleOpenEditModal(quote)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenQuickActions(quote)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {quote.status !== "Converted" && (
                      <button
                        onClick={() => handleDeleteQuote(quote._id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View (Mobile Optimized)
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={
                          selectedQuotes.length === quotes.length &&
                          quotes.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quote
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {quotes.map((quote) => (
                    <tr key={quote._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedQuotes.includes(quote._id)}
                          onChange={() => toggleSelectQuote(quote._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {quote.number}
                          </div>
                          <div className="text-sm text-gray-600 md:hidden">
                            {quote.client.companyName}
                          </div>
                          <div className="text-xs text-gray-500 sm:hidden">
                            {quote.formattedDate}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="font-medium">
                          {quote.client.companyName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {quote.client.customerCode}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{quote.formattedDate}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="font-bold text-blue-600">
                          {quote.formattedTotalDue}
                        </div>
                        <div className="text-xs text-gray-600">
                          VAT: {quote.formattedVATTotal}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={quote.status}
                          daysValid={quote.daysValid}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(quote)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenQuickActions(quote)}
                            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border rounded-lg disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, currentPage - 1) + i;
                if (pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100"
                    }`}>
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border rounded-lg disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Floating Action Button (Mobile) */}
        <FloatingActionButton onClick={() => setShowCreateModal(true)} />

        {/* Modals */}
        <CreateQuoteModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSuccess}
        />

        <EditQuoteModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          quote={selectedQuote}
          onSuccess={handleSuccess}
        />

        <QuickActionsModal
          isOpen={showQuickActionsModal}
          onClose={() => setShowQuickActionsModal(false)}
          quote={selectedQuote}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
