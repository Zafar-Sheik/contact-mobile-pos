// app/workflow/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Check,
  X,
  RefreshCw,
  Calendar,
  Building,
  MapPin,
  DollarSign,
  Package,
  AlertCircle,
} from "lucide-react";
import BackArrow from "../components/BackArrow";

// Types based on your models
interface StockItem {
  _id: string;
  name: string;
  code: string;
  price: {
    cost: number;
    sellingC: number;
    VAT: number;
  };
  qty: number;
}

interface Client {
  _id: string;
  customerCode: string;
  companyName: string;
  owner: string;
  email?: string;
  cellNo?: string;
}

interface WorkflowItem {
  stockItem: string | StockItem;
  qty: number;
}

interface Workflow {
  _id: string;
  date: string;
  client: string | Client;
  location: string;
  estCost: number;
  status: "Pending" | "In Progress" | "Completed" | "Invoice";
  stockItems: WorkflowItem[];
  created_at: string;
  updated_at: string;
  formattedEstCost?: string;
  totalItems?: number;
}

type WorkflowStatus = "Pending" | "In Progress" | "Completed" | "Invoice";

// Define the form data type
interface WorkflowFormData {
  date: string;
  client: string;
  location: string;
  estCost: string;
  status: WorkflowStatus;
  stockItems: WorkflowItem[];
}

export default function WorkflowPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<WorkflowFormData>({
    date: new Date().toISOString().split("T")[0],
    client: "",
    location: "",
    estCost: "",
    status: "Pending",
    stockItems: [],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (clientFilter) params.append("client", clientFilter);
      if (searchTerm) params.append("search", searchTerm);

      console.log("Fetching workflows with params:", params.toString());

      const response = await fetch(`/api/workflow?${params}`);
      console.log("Response status:", response.status);

      const data = await response.json();
      console.log("Workflow API response:", data);

      if (data.success) {
        setWorkflows(data.data);
      } else {
        console.error("Failed to fetch workflows:", data.message);
      }
    } catch (error) {
      console.error("Error fetching workflows:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter, searchTerm]);

  // Fetch clients for dropdown
  const fetchClients = async () => {
    try {
      const response = await fetch("/api/client?limit=100");
      const data = await response.json();
      if (data.success) {
        setClients(data.data);
      } else {
        console.error("Failed to fetch clients:", data.error);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  // Fetch stock items for dropdown
  const fetchStockItems = async () => {
    try {
      const response = await fetch("/api/stock-item?limit=100&isActive=true");
      const data = await response.json();
      if (data.success) {
        setStockItems(data.data);
      } else {
        console.error("Failed to fetch stock items:", data.error);
      }
    } catch (error) {
      console.error("Error fetching stock items:", error);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    fetchClients();
    fetchStockItems();
  }, [fetchWorkflows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError("");
    setIsSubmitting(true);

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.client) newErrors.client = "Client is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.estCost || parseFloat(formData.estCost) <= 0)
      newErrors.estCost = "Valid estimated cost is required";
    if (formData.stockItems.length === 0)
      newErrors.stockItems = "At least one stock item is required";

    // Validate each stock item
    formData.stockItems.forEach((item, index) => {
      if (!item.stockItem) {
        newErrors[`stockItem_${index}`] = "Stock item is required";
      }
      if (!item.qty || item.qty < 1) {
        newErrors[`qty_${index}`] = "Quantity must be at least 1";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // Prepare the request body
      const requestBody = {
        date: formData.date,
        client: formData.client,
        location: formData.location.trim(),
        estCost: parseFloat(formData.estCost),
        status: formData.status,
        stockItems: formData.stockItems.map((item) => ({
          stockItem:
            typeof item.stockItem === "string"
              ? item.stockItem
              : item.stockItem._id,
          qty: parseInt(item.qty.toString()),
        })),
      };

      console.log("Submitting workflow data:", requestBody);

      const url = editingId ? `/api/workflow/${editingId}` : "/api/workflow";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId ? { ...requestBody, id: editingId } : requestBody
        ),
      });

      console.log("Response status:", response.status);

      const data = await response.json();
      console.log("Server response:", data);

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }

      if (data.success) {
        fetchWorkflows();
        resetForm();
        setIsModalOpen(false);
        setSubmitError("");
      } else {
        setSubmitError(data.message || data.error || "Failed to save workflow");
      }
    } catch (error: any) {
      console.error("Error saving workflow:", error);
      setSubmitError(
        error.message ||
          "Failed to save workflow. Please check your network connection."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingId(workflow._id);
    setFormData({
      date: workflow.date.split("T")[0],
      client:
        typeof workflow.client === "string"
          ? workflow.client
          : workflow.client._id,
      location: workflow.location,
      estCost: workflow.estCost.toString(),
      status: workflow.status,
      stockItems: workflow.stockItems.map((item) => ({
        stockItem:
          typeof item.stockItem === "string"
            ? item.stockItem
            : item.stockItem._id,
        qty: item.qty,
      })),
    });
    setIsModalOpen(true);
    setSubmitError("");
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/workflow/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        fetchWorkflows();
        setIsDeleteModalOpen(false);
        setSelectedWorkflow(null);
      } else {
        alert(data.message || "Failed to delete workflow");
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
      alert("Failed to delete workflow");
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: WorkflowStatus) => {
    try {
      const response = await fetch(`/api/workflow/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        fetchWorkflows();
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      client: "",
      location: "",
      estCost: "",
      status: "Pending",
      stockItems: [],
    });
    setEditingId(null);
    setErrors({});
    setSubmitError("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Invoice":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const addStockItem = () => {
    setFormData({
      ...formData,
      stockItems: [...formData.stockItems, { stockItem: "", qty: 1 }],
    });
  };

  const updateStockItem = (
    index: number,
    field: keyof WorkflowItem,
    value: any
  ) => {
    const updatedItems = [...formData.stockItems];
    if (field === "qty") {
      value = parseInt(value) || 1;
    }
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, stockItems: updatedItems });
  };

  const removeStockItem = (index: number) => {
    const updatedItems = formData.stockItems.filter((_, i) => i !== index);
    setFormData({ ...formData, stockItems: updatedItems });
  };

  const filteredWorkflows = workflows.filter((workflow) => {
    const clientName =
      typeof workflow.client === "string"
        ? ""
        : workflow.client.companyName.toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    return (
      clientName.includes(searchLower) ||
      workflow.location.toLowerCase().includes(searchLower) ||
      workflow._id.includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <BackArrow />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Workflow Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your workflows and track progress
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </button>

          {/* Create Button */}
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-5 h-5" />
            <span>New Workflow</span>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Invoice">Invoice</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All Clients</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.companyName} ({client.customerCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStatusFilter("");
                    setClientFilter("");
                    setSearchTerm("");
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <RefreshCw className="w-4 h-4" />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Error Alert */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{submitError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workflows List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="text-center p-8">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No workflows found
            </h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first workflow
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-5 h-5" />
              Create Workflow
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWorkflows.map((workflow) => {
                  const client =
                    typeof workflow.client === "string"
                      ? clients.find((c) => c._id === workflow.client)
                      : workflow.client;

                  return (
                    <tr key={workflow._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {new Date(workflow.date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {client?.companyName || "Unknown Client"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {client?.customerCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {workflow.location}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {workflow.stockItems.reduce(
                            (sum, item) => sum + item.qty,
                            0
                          )}{" "}
                          items
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            R {(workflow.estCost || 0).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            workflow.status
                          )}`}>
                          {workflow.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(workflow)}
                            className="p-1 text-blue-600 hover:text-blue-900"
                            title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleStatusUpdate(workflow._id, "Completed")
                            }
                            className="p-1 text-green-600 hover:text-green-900"
                            title="Mark as Completed">
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWorkflow(workflow);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 text-red-600 hover:text-red-900"
                            title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? "Edit Workflow" : "Create New Workflow"}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              {submitError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Client */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.client}
                      onChange={(e) =>
                        setFormData({ ...formData, client: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isSubmitting}>
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.companyName} ({client.customerCode})
                        </option>
                      ))}
                    </select>
                    {errors.client && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.client}
                      </p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      placeholder="Enter location address"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isSubmitting}
                    />
                    {errors.location && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.location}
                      </p>
                    )}
                  </div>

                  {/* Estimated Cost */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Cost (ZAR){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">R</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.estCost}
                        onChange={(e) =>
                          setFormData({ ...formData, estCost: e.target.value })
                        }
                        placeholder="0.00"
                        className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.estCost && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.estCost}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as WorkflowStatus,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Invoice">Invoice</option>
                    </select>
                  </div>

                  {/* Stock Items */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Stock Items <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={addStockItem}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                        disabled={isSubmitting}>
                        + Add Item
                      </button>
                    </div>

                    {formData.stockItems.length === 0 ? (
                      <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-500">No items added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.stockItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <select
                                value={
                                  typeof item.stockItem === "string"
                                    ? item.stockItem
                                    : item.stockItem._id
                                }
                                onChange={(e) =>
                                  updateStockItem(
                                    index,
                                    "stockItem",
                                    e.target.value
                                  )
                                }
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                required
                                disabled={isSubmitting}>
                                <option value="">Select item</option>
                                {stockItems.map((stockItem) => (
                                  <option
                                    key={stockItem._id}
                                    value={stockItem._id}>
                                    {stockItem.name} ({stockItem.code}) - R
                                    {(
                                      stockItem.price?.sellingC || 0
                                    ).toLocaleString()}
                                  </option>
                                ))}
                              </select>
                              {errors[`stockItem_${index}`] && (
                                <p className="mt-1 text-xs text-red-600">
                                  {errors[`stockItem_${index}`]}
                                </p>
                              )}
                            </div>
                            <div className="w-24">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) =>
                                  updateStockItem(index, "qty", e.target.value)
                                }
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                required
                                disabled={isSubmitting}
                              />
                              {errors[`qty_${index}`] && (
                                <p className="mt-1 text-xs text-red-600">
                                  {errors[`qty_${index}`]}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStockItem(index)}
                              className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-400"
                              disabled={isSubmitting}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {errors.stockItems && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.stockItems}
                      </p>
                    )}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={isSubmitting}>
                    {isSubmitting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {editingId ? "Update" : "Create"} Workflow
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Workflow
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete this workflow? This action
                cannot be undone.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Client:</span>{" "}
                  {typeof selectedWorkflow.client === "string"
                    ? "Unknown Client"
                    : selectedWorkflow.client.companyName}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Location:</span>{" "}
                  {selectedWorkflow.location}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Cost:</span> R{" "}
                  {(selectedWorkflow.estCost || 0).toLocaleString()}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedWorkflow(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(selectedWorkflow._id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
