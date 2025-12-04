// app/staff/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  UserPlus,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface StaffMember {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  IDNumber: string;
  address: string;
  cellNumber: string;
  paymentMethod: "Daily" | "Weekly" | "Monthly";
  financialAdjustments: {
    deductions: number;
    advance: number;
    loans: number;
  };
  totalAdjustments: number;
  formattedTotalAdjustments: string;
  created_at: string;
  updated_at: string;
}

interface StaffFormData {
  firstName: string;
  lastName: string;
  IDNumber: string;
  address: string;
  cellNumber: string;
  paymentMethod: "Daily" | "Weekly" | "Monthly";
  financialAdjustments: {
    deductions: string;
    advance: string;
    loans: string;
  };
}

const initialFormData: StaffFormData = {
  firstName: "",
  lastName: "",
  IDNumber: "",
  address: "",
  cellNumber: "",
  paymentMethod: "Monthly",
  financialAdjustments: {
    deductions: "0",
    advance: "0",
    loans: "0",
  },
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<StaffFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 10;

  // Fetch staff data
  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchTerm) params.append("search", searchTerm);
      if (paymentFilter !== "all")
        params.append("paymentMethod", paymentFilter);

      const response = await fetch(`/api/staff?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch staff: ${response.status}`);
      }

      const data = await response.json();
      setStaff(data.data);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
      console.error("Error fetching staff:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, paymentFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("financialAdjustments.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        financialAdjustments: {
          ...prev.financialAdjustments,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Load staff data for editing
  const loadStaffForEdit = async (id: string) => {
    try {
      const staffMember = staff.find((s) => s._id === id);
      if (staffMember) {
        setFormData({
          firstName: staffMember.firstName,
          lastName: staffMember.lastName,
          IDNumber: staffMember.IDNumber,
          address: staffMember.address,
          cellNumber: staffMember.cellNumber,
          paymentMethod: staffMember.paymentMethod,
          financialAdjustments: {
            deductions: staffMember.financialAdjustments.deductions.toString(),
            advance: staffMember.financialAdjustments.advance.toString(),
            loans: staffMember.financialAdjustments.loans.toString(),
          },
        });
        setEditingId(id);
        setShowForm(true);
      }
    } catch (err) {
      setError("Failed to load staff data for editing");
      console.error(err);
    }
  };

  // View staff details
  const loadStaffForView = (id: string) => {
    const staffMember = staff.find((s) => s._id === id);
    if (staffMember) {
      setViewingId(id);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const payload = {
        ...formData,
        financialAdjustments: {
          deductions: parseFloat(formData.financialAdjustments.deductions) || 0,
          advance: parseFloat(formData.financialAdjustments.advance) || 0,
          loans: parseFloat(formData.financialAdjustments.loans) || 0,
        },
      };

      const url = editingId ? `/api/staff?id=${editingId}` : "/api/staff";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save staff");
      }

      // Refresh data and reset form
      await fetchStaff();
      resetForm();
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save staff");
      console.error(err);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/staff?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete staff");
      }

      // Refresh data
      await fetchStaff();
      setConfirmDelete(null);
    } catch (err) {
      setError("Failed to delete staff");
      console.error(err);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setViewingId(null);
  };

  // Get staff member being viewed
  const viewingStaff = viewingId
    ? staff.find((s) => s._id === viewingId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Staff Management
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your staff members and their financial adjustments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Total Staff</div>
          <div className="text-2xl font-bold text-gray-900">{staff.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">
            Monthly Payments
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {staff.filter((s) => s.paymentMethod === "Monthly").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">
            Weekly Payments
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {staff.filter((s) => s.paymentMethod === "Weekly").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">
            Total Adjustments
          </div>
          <div className="text-2xl font-bold text-gray-900">
            R{" "}
            {staff
              .reduce((sum, s) => sum + s.totalAdjustments, 0)
              .toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name, ID or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Button (Mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="h-5 w-5" />
            Filters
          </button>

          {/* Filter Dropdown (Desktop) */}
          <div className="hidden md:block">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">All Payment Methods</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          {/* Add Staff Button */}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-5 w-5" />
            Add Staff
          </button>
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="mt-4 p-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">All Payment Methods</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-red-800">
            <span className="font-medium">Error:</span>
            <span className="ml-2">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Staff List */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Table Header (Desktop) */}
          <div className="hidden md:grid md:grid-cols-12 bg-gray-50 px-6 py-3 text-sm font-medium text-gray-900 border-b">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">ID Number</div>
            <div className="col-span-2">Phone</div>
            <div className="col-span-2">Payment Method</div>
            <div className="col-span-2">Adjustments</div>
            <div className="col-span-1">Actions</div>
          </div>

          {/* Staff List */}
          {staff.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No staff members found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || paymentFilter !== "all"
                  ? "Try changing your search or filters"
                  : "Get started by adding your first staff member"}
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Add Staff Member
              </button>
            </div>
          ) : (
            <>
              {staff.map((member) => (
                <div
                  key={member._id}
                  className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  {/* Desktop View */}
                  <div className="hidden md:grid md:grid-cols-12 px-6 py-4 items-center">
                    <div className="col-span-3">
                      <div className="font-medium text-gray-900">
                        {member.fullName}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {member.address}
                      </div>
                    </div>
                    <div className="col-span-2 font-mono text-gray-700">
                      {member.IDNumber}
                    </div>
                    <div className="col-span-2">{member.cellNumber}</div>
                    <div className="col-span-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          member.paymentMethod === "Monthly"
                            ? "bg-blue-100 text-blue-800"
                            : member.paymentMethod === "Weekly"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                        {member.paymentMethod}
                      </span>
                    </div>
                    <div className="col-span-2 font-medium">
                      {member.formattedTotalAdjustments}
                    </div>
                    <div className="col-span-1 flex items-center gap-2">
                      <button
                        onClick={() => loadStaffForView(member._id)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View Details">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => loadStaffForEdit(member._id)}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(member._id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {member.fullName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {member.address}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => loadStaffForView(member._id)}
                          className="p-1 text-gray-400 hover:text-blue-600">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => loadStaffForEdit(member._id)}
                          className="p-1 text-gray-400 hover:text-green-600">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(member._id)}
                          className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">ID:</span>
                        <span className="ml-2 font-mono">
                          {member.IDNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <span className="ml-2">{member.cellNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Payment:</span>
                        <span className="ml-2">{member.paymentMethod}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Adjustments:</span>
                        <span className="ml-2 font-medium">
                          {member.formattedTotalAdjustments}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <div className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </div>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? "Edit Staff Member" : "Add New Staff Member"}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Personal Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Personal Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ID Number *
                      </label>
                      <input
                        type="text"
                        name="IDNumber"
                        value={formData.IDNumber}
                        onChange={handleInputChange}
                        required
                        disabled={!!editingId}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cell Number *
                      </label>
                      <input
                        type="tel"
                        name="cellNumber"
                        value={formData.cellNumber}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Payment Details
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="Monthly">Monthly</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Daily">Daily</option>
                    </select>
                  </div>
                </div>

                {/* Financial Adjustments */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Financial Adjustments
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deductions (R)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="financialAdjustments.deductions"
                        value={formData.financialAdjustments.deductions}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Advance (R)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="financialAdjustments.advance"
                        value={formData.financialAdjustments.advance}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loans (R)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="financialAdjustments.loans"
                        value={formData.financialAdjustments.loans}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col-reverse md:flex-row gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    {editingId ? "Update Staff Member" : "Add Staff Member"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingId && viewingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Staff Details
                </h2>
                <button
                  onClick={() => setViewingId(null)}
                  className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Personal Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium">{viewingStaff.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ID Number</p>
                      <p className="font-mono font-medium">
                        {viewingStaff.IDNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cell Number</p>
                      <p className="font-medium">{viewingStaff.cellNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">{viewingStaff.address}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Payment Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Payment Method</p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                          viewingStaff.paymentMethod === "Monthly"
                            ? "bg-blue-100 text-blue-800"
                            : viewingStaff.paymentMethod === "Weekly"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                        {viewingStaff.paymentMethod}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Adjustments</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {viewingStaff.formattedTotalAdjustments}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Adjustments */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Financial Adjustments Breakdown
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Deductions</p>
                      <p className="text-xl font-bold text-red-600">
                        R{" "}
                        {viewingStaff.financialAdjustments.deductions.toFixed(
                          2
                        )}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Advance</p>
                      <p className="text-xl font-bold text-yellow-600">
                        R {viewingStaff.financialAdjustments.advance.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Loans</p>
                      <p className="text-xl font-bold text-purple-600">
                        R {viewingStaff.financialAdjustments.loans.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Record Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Created</p>
                      <p className="font-medium">
                        {new Date(viewingStaff.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="font-medium">
                        {new Date(viewingStaff.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t">
                  <button
                    onClick={() => {
                      setViewingId(null);
                      loadStaffForEdit(viewingStaff._id);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <Edit2 className="h-4 w-4" />
                    Edit Staff Member
                  </button>
                  <button
                    onClick={() => {
                      setViewingId(null);
                      setConfirmDelete(viewingStaff._id);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Staff Member
                </h3>
                <p className="text-gray-500 mb-6">
                  Are you sure you want to delete this staff member? This action
                  cannot be undone.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(confirmDelete)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Delete
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
