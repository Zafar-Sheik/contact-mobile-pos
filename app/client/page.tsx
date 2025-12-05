// app/clients/page.tsx
"use client";

import { useState, useEffect } from "react";
import BackArrow from "../components/BackArrow";

// Types
interface Client {
  _id: string;
  customerCode: string;
  companyName: string;
  owner: string;
  address?: string;
  cellNo?: string;
  email?: string;
  VATNo?: string;
  regNo?: string;
  priceCategory: string;
  creditLimit: number;
  formattedCreditLimit: string;
}

interface ClientFormData {
  customerCode: string;
  companyName: string;
  owner: string;
  address: string;
  cellNo: string;
  email: string;
  VATNo: string;
  regNo: string;
  priceCategory: string;
  creditLimit: string;
}

// Simple Modal Component
const ClientModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialData,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => Promise<void>;
  title: string;
  initialData?: Partial<ClientFormData>;
  loading: boolean;
}) => {
  const [formData, setFormData] = useState<ClientFormData>({
    customerCode: "",
    companyName: "",
    owner: "",
    address: "",
    cellNo: "",
    email: "",
    VATNo: "",
    regNo: "",
    priceCategory: "C",
    creditLimit: "0",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        customerCode: initialData.customerCode || "",
        companyName: initialData.companyName || "",
        owner: initialData.owner || "",
        address: initialData.address || "",
        cellNo: initialData.cellNo || "",
        email: initialData.email || "",
        VATNo: initialData.VATNo || "",
        regNo: initialData.regNo || "",
        priceCategory: initialData.priceCategory || "C",
        creditLimit: initialData.creditLimit?.toString() || "0",
      });
    } else {
      setFormData({
        customerCode: "",
        companyName: "",
        owner: "",
        address: "",
        cellNo: "",
        email: "",
        VATNo: "",
        regNo: "",
        priceCategory: "C",
        creditLimit: "0",
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
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
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Customer Code *
              </label>
              <input
                type="text"
                required
                value={formData.customerCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customerCode: e.target.value.toUpperCase(),
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                placeholder="CLIENT001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                placeholder="ABC Enterprises"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Owner Name *
              </label>
              <input
                type="text"
                required
                value={formData.owner}
                onChange={(e) =>
                  setFormData({ ...formData, owner: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                placeholder="123 Main Street, Johannesburg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="info@company.co.za"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cell No *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.cellNo}
                  onChange={(e) =>
                    setFormData({ ...formData, cellNo: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0831234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  VAT Number
                </label>
                <input
                  type="text"
                  value={formData.VATNo}
                  onChange={(e) =>
                    setFormData({ ...formData, VATNo: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="4123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={formData.regNo}
                  onChange={(e) =>
                    setFormData({ ...formData, regNo: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="1999/012345/07"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price Category *
                </label>
                <select
                  value={formData.priceCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, priceCategory: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Credit Limit *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, creditLimit: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="10000"
                />
              </div>
            </div>

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
    </>
  );
};

// Client List Item Component
const ClientItem = ({
  client,
  onEdit,
  onDelete,
}: {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">{client.companyName}</h3>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                client.priceCategory === "A"
                  ? "bg-green-100 text-green-800"
                  : client.priceCategory === "B"
                  ? "bg-blue-100 text-blue-800"
                  : client.priceCategory === "C"
                  ? "bg-yellow-100 text-yellow-800"
                  : client.priceCategory === "D"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-red-100 text-red-800"
              }`}>
              Cat {client.priceCategory}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium">{client.customerCode}</span> •{" "}
            {client.owner}
          </p>
          {client.address && (
            <p className="mt-1 text-sm text-gray-500">📍 {client.address}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
            {client.email && <span>📧 {client.email}</span>}
            {client.cellNo && <span>📱 {client.cellNo}</span>}
            <span>💰 {client.formattedCreditLimit}</span>
          </div>
          {(client.VATNo || client.regNo) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
              {client.VATNo && <span>VAT: {client.VATNo}</span>}
              {client.regNo && <span>Reg: {client.regNo}</span>}
            </div>
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

// Main Component
export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalType, setModalType] = useState<"create" | "edit">("create");
  const [search, setSearch] = useState("");
  const [priceCategory, setPriceCategory] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (priceCategory) params.set("priceCategory", priceCategory);

      const response = await fetch(`/api/client?${params}`);
      const data = await response.json();

      if (data.success) {
        setClients(data.data);
      } else {
        console.error("Failed to fetch clients:", data.error);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, priceCategory]);

  const handleCreate = async (formData: ClientFormData) => {
    setModalLoading(true);
    try {
      const response = await fetch("/api/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          creditLimit: parseFloat(formData.creditLimit),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || data.details || "Failed to create client");
        if (data.missingFields) {
          alert(`Missing fields: ${data.missingFields.join(", ")}`);
        }
        return;
      }

      setModalOpen(false);
      fetchClients(); // Refresh list
    } catch (error: any) {
      alert(error.message || "Failed to create client");
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdate = async (formData: ClientFormData) => {
    if (!selectedClient) return;

    setModalLoading(true);
    try {
      const response = await fetch("/api/client", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedClient._id,
          ...formData,
          creditLimit: parseFloat(formData.creditLimit),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || data.details || "Failed to update client");
        return;
      }

      setModalOpen(false);
      setSelectedClient(null);
      fetchClients(); // Refresh list
    } catch (error: any) {
      alert(error.message || "Failed to update client");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;

    try {
      const response = await fetch(`/api/client?id=${selectedClient._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to delete client");
        return;
      }

      setDeleteModalOpen(false);
      setSelectedClient(null);
      fetchClients(); // Refresh list
    } catch (error: any) {
      alert(error.message || "Failed to delete client");
    }
  };

  const handleEditClick = (client: Client) => {
    setSelectedClient(client);
    setModalType("edit");
    setModalOpen(true);
  };

  const handleDeleteClick = (client: Client) => {
    setSelectedClient(client);
    setDeleteModalOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedClient(null);
    setModalType("create");
    setModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearch("");
    setPriceCategory("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col justify-between sm:flex-row sm:items-center">
            <div>
              <div className="flex">
                <BackArrow />
                <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
              </div>

              <p className="mt-1 text-gray-600">Manage your client accounts</p>
            </div>
            <button
              onClick={handleCreateClick}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:mt-0">
              ➕ Add Client
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <select
                value={priceCategory}
                onChange={(e) => setPriceCategory(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">All Categories</option>
                <option value="A">Category A</option>
                <option value="B">Category B</option>
                <option value="C">Category C</option>
                <option value="D">Category D</option>
                <option value="E">Category E</option>
              </select>
            </div>
            <div>
              <button
                onClick={handleClearFilters}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-900">
              {clients.length}
            </div>
            <div className="text-sm text-gray-600">Total Clients</div>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {clients.filter((c) => c.priceCategory === "A").length}
            </div>
            <div className="text-sm text-gray-600">Category A</div>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {clients.filter((c) => c.priceCategory === "B").length}
            </div>
            <div className="text-sm text-gray-600">Category B</div>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">
              {
                clients.filter((c) => !["A", "B"].includes(c.priceCategory))
                  .length
              }
            </div>
            <div className="text-sm text-gray-600">Other Categories</div>
          </div>
        </div>

        {/* Client List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-gray-200"
              />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="text-3xl">🏢</div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">
              No clients found
            </h3>
            <p className="mt-1 text-gray-600">
              {search || priceCategory
                ? "Try adjusting your filters"
                : "Get started by adding your first client"}
            </p>
            <button
              onClick={handleCreateClick}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Add First Client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <ClientItem
                key={client._id}
                client={client}
                onEdit={() => handleEditClick(client)}
                onDelete={() => handleDeleteClick(client)}
              />
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <ClientModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedClient(null);
          }}
          onSubmit={modalType === "create" ? handleCreate : handleUpdate}
          title={modalType === "create" ? "Add New Client" : "Edit Client"}
          initialData={
            modalType === "edit" && selectedClient
              ? {
                  customerCode: selectedClient.customerCode,
                  companyName: selectedClient.companyName,
                  owner: selectedClient.owner,
                  address: selectedClient.address || "",
                  cellNo: selectedClient.cellNo || "",
                  email: selectedClient.email || "",
                  VATNo: selectedClient.VATNo || "",
                  regNo: selectedClient.regNo || "",
                  priceCategory: selectedClient.priceCategory,
                  creditLimit: selectedClient.creditLimit.toString(),
                }
              : undefined
          }
          loading={modalLoading}
        />

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-bold text-gray-900">Delete Client</h2>
              <p className="mt-2 text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  {selectedClient.companyName}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setSelectedClient(null);
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
