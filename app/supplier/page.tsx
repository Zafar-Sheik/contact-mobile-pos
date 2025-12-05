// app/suppliers/page.tsx
"use client";

import { useState, useEffect } from "react";
import BackArrow from "../components/BackArrow";

// Types
interface Supplier {
  _id: string;
  supplierCode: string;
  name: string;
  address?: string;
  cellNo?: string;
  contraAccount: boolean;
  formattedAddress?: string;
  created_at: string;
}

interface SupplierFormData {
  supplierCode: string;
  name: string;
  address: string;
  cellNo: string;
  contraAccount: boolean;
}

// Simple Modal Component
const SupplierModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialData,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SupplierFormData) => Promise<void>;
  title: string;
  initialData?: Partial<SupplierFormData>;
  loading: boolean;
}) => {
  const [formData, setFormData] = useState<SupplierFormData>({
    supplierCode: "",
    name: "",
    address: "",
    cellNo: "",
    contraAccount: false,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        supplierCode: initialData.supplierCode || "",
        name: initialData.name || "",
        address: initialData.address || "",
        cellNo: initialData.cellNo || "",
        contraAccount: initialData.contraAccount || false,
      });
    } else {
      setFormData({
        supplierCode: "",
        name: "",
        address: "",
        cellNo: "",
        contraAccount: false,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
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
              Supplier Code *
            </label>
            <input
              type="text"
              required
              value={formData.supplierCode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  supplierCode: e.target.value.toUpperCase(),
                })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="SUP-001"
              pattern="[A-Z0-9_-]+"
              title="Uppercase letters, numbers, hyphens, and underscores only"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use uppercase letters, numbers, hyphens, and underscores only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Supplier Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="ABC Supplies"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Address *
            </label>
            <textarea
              required
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="123 Main Street, Johannesburg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cell Number *
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
              pattern="0[6-9][0-9]{8}"
              title="10-digit South African number starting with 06-09"
            />
            <p className="mt-1 text-xs text-gray-500">
              10-digit SA number starting with 06-09
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="contraAccount"
              checked={formData.contraAccount}
              onChange={(e) =>
                setFormData({ ...formData, contraAccount: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="contraAccount"
              className="ml-2 text-sm text-gray-700">
              Contra Account
            </label>
            <span className="ml-2 text-xs text-gray-500">
              (Supplier can purchase from us)
            </span>
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
  );
};

// Supplier List Item Component
const SupplierItem = ({
  supplier,
  onEdit,
  onDelete,
}: {
  supplier: Supplier;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900">{supplier.name}</h3>
              {supplier.contraAccount && (
                <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                  Contra
                </span>
              )}
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
              {supplier.supplierCode}
            </span>
          </div>

          {supplier.formattedAddress && (
            <p className="mt-2 text-sm text-gray-600">
              📍 {supplier.formattedAddress}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            {supplier.cellNo && (
              <span className="flex items-center">📱 {supplier.cellNo}</span>
            )}
            <span className="text-xs text-gray-400">
              Created: {new Date(supplier.created_at).toLocaleDateString()}
            </span>
          </div>
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
export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [modalType, setModalType] = useState<"create" | "edit">("create");
  const [search, setSearch] = useState("");
  const [hasContraAccount, setHasContraAccount] = useState<string>("");
  const [modalLoading, setModalLoading] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (hasContraAccount) params.set("hasContraAccount", hasContraAccount);

      const response = await fetch(`/api/supplier?${params}`);
      const data = await response.json();

      if (data.success) {
        setSuppliers(data.data);
      } else {
        console.error("Failed to fetch suppliers:", data.error);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search, hasContraAccount]);

  const handleCreate = async (formData: SupplierFormData) => {
    setModalLoading(true);
    try {
      const response = await fetch("/api/supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || data.details || "Failed to create supplier");
        if (data.missingFields) {
          alert(`Missing fields: ${data.missingFields.join(", ")}`);
        }
        return;
      }

      setModalOpen(false);
      fetchSuppliers(); // Refresh list
    } catch (error: any) {
      alert(error.message || "Failed to create supplier");
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdate = async (formData: SupplierFormData) => {
    if (!selectedSupplier) return;

    setModalLoading(true);
    try {
      const response = await fetch("/api/supplier", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSupplier._id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || data.details || "Failed to update supplier");
        return;
      }

      setModalOpen(false);
      setSelectedSupplier(null);
      fetchSuppliers(); // Refresh list
    } catch (error: any) {
      alert(error.message || "Failed to update supplier");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;

    try {
      const response = await fetch(`/api/supplier?id=${selectedSupplier._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to delete supplier");
        return;
      }

      setDeleteModalOpen(false);
      setSelectedSupplier(null);
      fetchSuppliers(); // Refresh list
    } catch (error: any) {
      alert(error.message || "Failed to delete supplier");
    }
  };

  const handleEditClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setModalType("edit");
    setModalOpen(true);
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDeleteModalOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedSupplier(null);
    setModalType("create");
    setModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearch("");
    setHasContraAccount("");
  };

  const contraCount = suppliers.filter((s) => s.contraAccount).length;
  const regularCount = suppliers.length - contraCount;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col justify-between sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <BackArrow />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
                <p className="mt-1 text-gray-600">
                  Manage your suppliers and contra accounts
                </p>
              </div>
            </div>
            <button
              onClick={handleCreateClick}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:mt-0">
              ➕ Add Supplier
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
                placeholder="Search suppliers..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <select
                value={hasContraAccount}
                onChange={(e) => setHasContraAccount(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">All Suppliers</option>
                <option value="true">Contra Accounts Only</option>
                <option value="false">Regular Suppliers Only</option>
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
              {suppliers.length}
            </div>
            <div className="text-sm text-gray-600">Total Suppliers</div>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {contraCount}
            </div>
            <div className="text-sm text-gray-600">Contra Accounts</div>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {regularCount}
            </div>
            <div className="text-sm text-gray-600">Regular Suppliers</div>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {
                suppliers.filter((s) => s.cellNo && s.cellNo.length === 10)
                  .length
              }
            </div>
            <div className="text-sm text-gray-600">Valid Cell Numbers</div>
          </div>
        </div>

        {/* Supplier List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-gray-200"
              />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="text-3xl">🚚</div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">
              No suppliers found
            </h3>
            <p className="mt-1 text-gray-600">
              {search || hasContraAccount
                ? "Try adjusting your filters"
                : "Get started by adding your first supplier"}
            </p>
            <button
              onClick={handleCreateClick}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Add First Supplier
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <SupplierItem
                key={supplier._id}
                supplier={supplier}
                onEdit={() => handleEditClick(supplier)}
                onDelete={() => handleDeleteClick(supplier)}
              />
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <SupplierModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedSupplier(null);
          }}
          onSubmit={modalType === "create" ? handleCreate : handleUpdate}
          title={modalType === "create" ? "Add New Supplier" : "Edit Supplier"}
          initialData={
            modalType === "edit" && selectedSupplier
              ? {
                  supplierCode: selectedSupplier.supplierCode,
                  name: selectedSupplier.name,
                  address: selectedSupplier.address || "",
                  cellNo: selectedSupplier.cellNo || "",
                  contraAccount: selectedSupplier.contraAccount,
                }
              : undefined
          }
          loading={modalLoading}
        />

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && selectedSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-bold text-gray-900">
                Delete Supplier
              </h2>
              <p className="mt-2 text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold">{selectedSupplier.name}</span>?
                This action cannot be undone.
              </p>
              <p className="mt-2 text-sm text-red-600">
                Note: Supplier can only be deleted if they have no associated
                stock items, GRVs, or payments.
              </p>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setSelectedSupplier(null);
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
