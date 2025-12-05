// app/fuel/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Calendar,
  Car,
  Fuel,
  DollarSign,
  ChevronRight,
  X,
  Check,
  Droplets,
  Gauge,
  Route,
  Zap,
  MoreVertical,
  RefreshCw,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Download,
  FileText,
  Package,
} from "lucide-react";
import BackArrow from "../components/BackArrow";

interface FuelRecord {
  _id: string;
  date: string;
  formattedDate: string;
  vehicle: string;
  currentMileage: number;
  kmUsedSinceLastFill: number;
  litresFilled: number;
  randValue: number;
  garageName: string;
  costPerLitre: number;
  kmPerLitre: number;
  costPerKm: number;
  formattedRandValue: string;
  formattedCostPerLitre: string;
  formattedKmPerLitre: string;
  formattedCostPerKm: string;
}

interface FuelSummary {
  totalRecords: number;
  totalFuelCost: number;
  totalLitres: number;
  formattedTotalFuelCost: string;
}

export default function FuelPage() {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [summary, setSummary] = useState<FuelSummary | null>(null);
  const [vehicles, setVehicles] = useState<string[]>(["All Vehicles"]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FuelRecord | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    vehicle: "",
    currentMileage: "",
    kmUsedSinceLastFill: "",
    litresFilled: "",
    randValue: "",
    garageName: "",
  });

  // Fetch fuel records
  const fetchFuelRecords = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(selectedVehicle !== "all" && { vehicle: selectedVehicle }),
      });

      const response = await fetch(`/api/fuel?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.data as FuelRecord[]);
        setSummary(data.summary);
        // Extract unique vehicles
        const uniqueVehicles: string[] = [
          "All Vehicles",
          ...new Set(
            (data.data as FuelRecord[]).map((r: FuelRecord) => r.vehicle)
          ),
        ];
        setVehicles(uniqueVehicles.slice(0, 6)); // Limit to 5 vehicles + "All Vehicles"
      }
    } catch (error) {
      console.error("Error fetching fuel records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuelRecords();
  }, [searchTerm, selectedVehicle]);

  const handleRefresh = () => {
    fetchFuelRecords();
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this fuel record?")) return;

    try {
      const response = await fetch(`/api/fuel?id=${recordId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        fetchFuelRecords();
      } else {
        alert(data.error || "Failed to delete fuel record");
      }
    } catch (error) {
      console.error("Error deleting fuel record:", error);
      alert("Failed to delete fuel record");
    }
  };

  const handleOpenEditModal = (record: FuelRecord) => {
    setSelectedRecord(record);
    setFormData({
      date: record.date.split("T")[0],
      vehicle: record.vehicle,
      currentMileage: record.currentMileage.toString(),
      kmUsedSinceLastFill: record.kmUsedSinceLastFill.toString(),
      litresFilled: record.litresFilled.toString(),
      randValue: record.randValue.toString(),
      garageName: record.garageName,
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (isEdit: boolean = false) => {
    // Simple validation
    const requiredFields = [
      "vehicle",
      "currentMileage",
      "kmUsedSinceLastFill",
      "litresFilled",
      "randValue",
      "garageName",
    ];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]?.trim()) {
        alert(
          `Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`
        );
        return;
      }
    }

    try {
      const url = isEdit ? `/api/fuel?id=${selectedRecord?._id}` : "/api/fuel";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          currentMileage: parseFloat(formData.currentMileage),
          kmUsedSinceLastFill: parseFloat(formData.kmUsedSinceLastFill),
          litresFilled: parseFloat(formData.litresFilled),
          randValue: parseFloat(formData.randValue),
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchFuelRecords();
        if (isEdit) {
          setShowEditModal(false);
        } else {
          setShowCreateModal(false);
          // Reset form
          setFormData({
            date: new Date().toISOString().split("T")[0],
            vehicle: "",
            currentMileage: "",
            kmUsedSinceLastFill: "",
            litresFilled: "",
            randValue: "",
            garageName: "",
          });
        }
      } else {
        alert(data.error || "Failed to save fuel record");
      }
    } catch (error) {
      console.error("Error saving fuel record:", error);
      alert("Failed to save fuel record");
    }
  };

  // Modal component
  const FuelModal = ({ isEdit = false }: { isEdit?: boolean }) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const onClose = () =>
      isEdit ? setShowEditModal(false) : setShowCreateModal(false);
    const modalTitle = isEdit ? "Edit Fuel Record" : "Add Fuel Record";

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b bg-white rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {modalTitle}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isEdit
                    ? "Update fuel record details"
                    : "Record vehicle fuel consumption"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Vehicle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle
                  </label>
                  <div className="relative">
                    <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.vehicle}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          vehicle: e.target.value,
                        }))
                      }
                      placeholder="Enter vehicle name"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Current Mileage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Mileage (km)
                  </label>
                  <div className="relative">
                    <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      step="0.1"
                      value={formData.currentMileage}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          currentMileage: e.target.value,
                        }))
                      }
                      placeholder="Enter current mileage"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Kilometers Used */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilometers Used Since Last Fill
                  </label>
                  <div className="relative">
                    <Route className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      step="0.1"
                      value={formData.kmUsedSinceLastFill}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          kmUsedSinceLastFill: e.target.value,
                        }))
                      }
                      placeholder="Enter kilometers used"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Litres Filled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Litres Filled
                  </label>
                  <div className="relative">
                    <Droplets className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.litresFilled}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          litresFilled: e.target.value,
                        }))
                      }
                      placeholder="Enter litres filled"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Cost (ZAR)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.randValue}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          randValue: e.target.value,
                        }))
                      }
                      placeholder="Enter total cost"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Garage Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Garage Name
                  </label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.garageName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          garageName: e.target.value,
                        }))
                      }
                      placeholder="Enter garage name"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmit(isEdit)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {isEdit ? "Update Record" : "Add Record"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <BackArrow />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Fuel Management
              </h1>
              <p className="text-gray-600 text-sm">
                Track and analyze vehicle fuel consumption
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by vehicle or garage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              {vehicles.map((vehicle) => (
                <button
                  key={vehicle}
                  onClick={() =>
                    setSelectedVehicle(
                      vehicle === "All Vehicles" ? "all" : vehicle
                    )
                  }
                  className={`px-3 py-1.5 text-sm rounded-lg ${
                    (vehicle === "All Vehicles" && selectedVehicle === "all") ||
                    selectedVehicle === vehicle
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}>
                  {vehicle}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {summary && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Cost</p>
                  <p className="text-xl font-bold text-blue-600">
                    {summary.formattedTotalFuelCost}
                  </p>
                </div>
                <DollarSign className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Litres</p>
                  <p className="text-xl font-bold text-green-600">
                    {summary.totalLitres.toFixed(1)} L
                  </p>
                </div>
                <Droplets className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Refresh">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => alert("Export functionality coming soon")}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Export">
              <Download className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">
            <Plus className="w-4 h-4" />
            Add Fuel Record
          </button>
        </div>

        {/* Fuel Records List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading fuel records...</p>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <Fuel className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No fuel records found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedVehicle !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first fuel record"}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">
              <Plus className="w-4 h-4" />
              Add Fuel Record
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Litres
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {record.formattedDate}
                        </div>
                        <div className="text-xs text-gray-500">
                          {record.garageName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{record.vehicle}</div>
                        <div className="text-sm text-gray-600">
                          {record.kmPerLitre.toFixed(1)} km/L
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {record.litresFilled} L
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-blue-600">
                          {record.formattedRandValue}
                        </div>
                        <div className="text-xs text-gray-600">
                          {record.formattedCostPerKm}/km
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(record)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record._id)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete">
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Modals */}
      <FuelModal />
      <FuelModal isEdit={true} />
    </div>
  );
}
