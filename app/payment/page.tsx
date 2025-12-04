// app/payments/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search,
  Edit,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  TrendingUp,
  FileText,
} from "lucide-react";

// Schema validation
const paymentSchema = z.object({
  client: z.string().min(1, "Client is required"),
  date: z.string().min(1, "Date is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum(["EFT", "Cash"]),
  allocationType: z.enum(["balanceBroughtForward", "selectedInvoice"]),
  invoice: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

// Update schema (only date and method can be updated)
const updatePaymentSchema = z.object({
  date: z.string().min(1, "Date is required"),
  method: z.enum(["EFT", "Cash"]),
});

type UpdatePaymentFormData = z.infer<typeof updatePaymentSchema>;

// Types
interface Payment {
  _id: string;
  date: string;
  formattedDate: string;
  amount: number;
  formattedAmount: string;
  method: "EFT" | "Cash";
  allocationType: "balanceBroughtForward" | "selectedInvoice";
  client: {
    _id: string;
    customerCode: string;
    companyName: string;
    owner: string;
  } | null;
  invoice: {
    _id: string;
    number: string;
    formattedTotalDue: string;
  } | null;
}

interface Client {
  _id: string;
  customerCode: string;
  companyName: string;
  owner: string;
  currentBalance?: string;
}

interface Invoice {
  _id: string;
  number: string;
  date: string;
  totalDue: number;
  formattedTotalDue: string;
  paymentStatus: string;
  balance: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // Form for creating new payment
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: "",
      method: "EFT",
      allocationType: "balanceBroughtForward",
    },
  });

  // Form for updating payment
  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    reset: resetUpdate,
    setValue: setValueUpdate,
    watch: watchUpdate,
    formState: { errors: updateErrors, isSubmitting: isUpdating },
  } = useForm<UpdatePaymentFormData>({
    resolver: zodResolver(updatePaymentSchema),
  });

  const watchAllocationType = watch("allocationType");
  const watchClient = watch("client");

  useEffect(() => {
    setIsClient(true);
    // Set default date only on client side
    setValue("date", new Date().toISOString().split("T")[0]);
  }, [setValue]);

  // Fetch payments
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sortBy: "date",
        sortOrder: "desc",
      });

      if (searchTerm) params.append("search", searchTerm);
      if (selectedClient) params.append("client", selectedClient);
      if (selectedMethod) params.append("method", selectedMethod);
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);

      const response = await fetch(`/api/payment?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPayments(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalAmount(data.summary.totalAmount);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch clients
  const fetchClients = async () => {
    try {
      const response = await fetch("/api/client?limit=100");
      const data = await response.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  // Fetch client invoices
  const fetchClientInvoices = async (clientId: string) => {
    if (!clientId) return;

    try {
      const response = await fetch(`/api/payment?clientId=${clientId}`);
      const data = await response.json();

      if (data.success && data.data.outstandingInvoices) {
        setInvoices(data.data.outstandingInvoices);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchClients();
  }, [page, selectedClient, selectedMethod, dateRange]);

  useEffect(() => {
    if (watchClient) {
      fetchClientInvoices(watchClient);
    } else {
      setInvoices([]);
    }
  }, [watchClient]);

  // Handle new payment submission
  const onSubmit = async (data: PaymentFormData) => {
    try {
      const paymentData = {
        ...data,
        amount: parseFloat(data.amount.toString()),
      };

      const response = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (result.success) {
        alert("Payment recorded successfully!");
        reset();
        setValue("date", new Date().toISOString().split("T")[0]);
        setShowPaymentForm(false);
        fetchPayments();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      alert("Failed to record payment");
    }
  };

  // Handle payment update
  const onUpdateSubmit = async (data: UpdatePaymentFormData) => {
    if (!selectedPayment) return;

    try {
      const updateData = {
        id: selectedPayment._id,
        ...data,
      };

      const response = await fetch("/api/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.success) {
        alert("Payment updated successfully!");
        setShowUpdateModal(false);
        setSelectedPayment(null);
        fetchPayments();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Failed to update payment");
    }
  };

  // Handle payment deletion
  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    try {
      const response = await fetch(`/api/payment?id=${paymentId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert("Payment deleted successfully!");
        fetchPayments();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Failed to delete payment");
    }
  };

  // Open update modal
  const openUpdateModal = (payment: Payment) => {
    setSelectedPayment(payment);
    const paymentDate = new Date(payment.date);
    const formattedDate = isNaN(paymentDate.getTime())
      ? new Date().toISOString().split("T")[0]
      : paymentDate.toISOString().split("T")[0];

    resetUpdate({
      date: formattedDate,
      method: payment.method,
    });
    setShowUpdateModal(true);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedClient("");
    setSelectedMethod("");
    setDateRange({ start: "", end: "" });
    setPage(1);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  // Get current method for update form
  const currentUpdateMethod = watchUpdate("method");

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
              <p className="text-gray-600 mt-1">
                Manage client payments and allocations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPaymentForm(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors">
                <Plus className="w-5 h-5" />
                Record New Payment
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Payments
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Cash Payments
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {payments.filter((p) => p.method === "Cash").length}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    EFT Payments
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {payments.filter((p) => p.method === "EFT").length}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Transactions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {payments.length}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by client, invoice, or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={fetchPayments}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Apply Filters
              </button>
            </div>
            <button
              onClick={resetFilters}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.companyName} ({client.customerCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="EFT">EFT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Allocation
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-gray-500">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr
                      key={payment._id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openUpdateModal(payment)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.formattedDate}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {payment.client?.companyName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payment.client?.customerCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {payment.formattedAmount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            payment.method === "Cash"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                          {payment.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {payment.invoice?.number || (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            payment.allocationType === "selectedInvoice"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-orange-100 text-orange-800"
                          }`}>
                          {payment.allocationType === "selectedInvoice"
                            ? "Invoice Payment"
                            : "Balance Payment"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openUpdateModal(payment);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit Payment">
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePayment(payment._id);
                            }}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete Payment">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {payments.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Payment Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Record New Payment
                </h2>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    {...register("date")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {createErrors.date && (
                    <p className="mt-1 text-sm text-red-600">
                      {createErrors.date.message}
                    </p>
                  )}
                </div>

                {/* Client */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client
                  </label>
                  <select
                    {...register("client")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>
                        {client.companyName} ({client.customerCode})
                      </option>
                    ))}
                  </select>
                  {createErrors.client && (
                    <p className="mt-1 text-sm text-red-600">
                      {createErrors.client.message}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (R)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("amount", { valueAsNumber: true })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  {createErrors.amount && (
                    <p className="mt-1 text-sm text-red-600">
                      {createErrors.amount.message}
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setValue("method", "EFT")}
                      className={`py-3 px-4 border rounded-lg text-center font-medium ${
                        watch("method") === "EFT"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}>
                      EFT
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("method", "Cash")}
                      className={`py-3 px-4 border rounded-lg text-center font-medium ${
                        watch("method") === "Cash"
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}>
                      Cash
                    </button>
                  </div>
                  {createErrors.method && (
                    <p className="mt-1 text-sm text-red-600">
                      {createErrors.method.message}
                    </p>
                  )}
                </div>

                {/* Allocation Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allocation Type
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        {...register("allocationType")}
                        value="balanceBroughtForward"
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium">Payment as a Whole</span>
                        <p className="text-sm text-gray-500">
                          Updates overall balance
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        {...register("allocationType")}
                        value="selectedInvoice"
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium">
                          Apply to Specific Invoice
                        </span>
                        <p className="text-sm text-gray-500">
                          Allocate to selected invoice
                        </p>
                      </div>
                    </label>
                  </div>
                  {createErrors.allocationType && (
                    <p className="mt-1 text-sm text-red-600">
                      {createErrors.allocationType.message}
                    </p>
                  )}
                </div>

                {/* Invoice Selection (Conditional) */}
                {watchAllocationType === "selectedInvoice" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Invoice
                    </label>
                    <select
                      {...register("invoice")}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!watchClient}>
                      <option value="">Select an invoice</option>
                      {invoices.map((invoice) => (
                        <option key={invoice._id} value={invoice._id}>
                          Invoice #{invoice.number} -{" "}
                          {invoice.formattedTotalDue} ({invoice.paymentStatus})
                        </option>
                      ))}
                    </select>
                    {createErrors.invoice && (
                      <p className="mt-1 text-sm text-red-600">
                        {createErrors.invoice.message}
                      </p>
                    )}
                    {!watchClient && (
                      <p className="mt-1 text-sm text-gray-500">
                        Please select a client first to view invoices
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentForm(false);
                      reset();
                      setValue("date", new Date().toISOString().split("T")[0]);
                    }}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isCreating ? "Processing..." : "Record Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Update Payment Modal */}
      {showUpdateModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Update Payment
                </h2>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedPayment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              {/* Payment Details Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Client</p>
                    <p className="font-medium">
                      {selectedPayment.client?.companyName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="font-medium">
                      {selectedPayment.formattedAmount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Allocation Type</p>
                    <p className="font-medium">
                      {selectedPayment.allocationType === "selectedInvoice"
                        ? "Invoice Payment"
                        : "Balance Payment"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Invoice</p>
                    <p className="font-medium">
                      {selectedPayment.invoice?.number || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleSubmitUpdate(onUpdateSubmit)}
                className="space-y-5">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    {...registerUpdate("date")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {updateErrors.date && (
                    <p className="mt-1 text-sm text-red-600">
                      {updateErrors.date.message}
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setValueUpdate("method", "EFT")}
                      className={`py-3 px-4 border rounded-lg text-center font-medium ${
                        currentUpdateMethod === "EFT"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}>
                      EFT
                    </button>
                    <button
                      type="button"
                      onClick={() => setValueUpdate("method", "Cash")}
                      className={`py-3 px-4 border rounded-lg text-center font-medium ${
                        currentUpdateMethod === "Cash"
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}>
                      Cash
                    </button>
                  </div>
                  {updateErrors.method && (
                    <p className="mt-1 text-sm text-red-600">
                      {updateErrors.method.message}
                    </p>
                  )}
                </div>

                {/* Note about what can be updated */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    Note: Only date and payment method can be updated. For other
                    changes, please delete this payment and create a new one.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpdateModal(false);
                      setSelectedPayment(null);
                    }}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isUpdating ? "Updating..." : "Update Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
