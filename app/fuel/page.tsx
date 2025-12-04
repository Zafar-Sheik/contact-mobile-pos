// app/fuel/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Copy,
  Download,
  Calendar,
  Car,
  Fuel,
  DollarSign,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Settings,
  Gauge,
  MapPin,
  Users,
  Printer,
  Mail,
  Share2,
  FileText,
  Package,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Menu,
  Grid,
  List,
  ArrowLeft,
  ArrowRight,
  Calculator,
  Percent,
  Hash,
  Zap,
  Battery,
  Droplets,
  Navigation,
  Route,
  Thermometer,
  Wind,
  Cloud,
  Sun,
  Moon,
  Activity,
  Layers,
  TrendingUp as TrendUp,
  TrendingDown as TrendDown,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

// Types
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
  created_at: string;
  updated_at: string;
}

interface FuelSummary {
  totalRecords: number;
  totalFuelCost: number;
  totalLitres: number;
  totalKm: number;
  avgCostPerLitre: number;
  avgKmPerLitre: number;
  avgCostPerKm: number;
  formattedTotalFuelCost: string;
  formattedAvgCostPerLitre: string;
  formattedAvgCostPerKm: string;
  vehicles: string[];
}

interface VehicleMetrics {
  vehicle: string;
  totalFuelCost: number;
  totalLitres: number;
  totalKm: number;
  recordCount: number;
  avgCostPerLitre: number;
  avgKmPerLitre: number;
  avgCostPerKm: number;
  formattedTotalFuelCost: string;
  formattedAvgCostPerLitre: string;
  formattedAvgCostPerKm: string;
}

// Modal Components
const CreateFuelModal = ({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    vehicle: "",
    currentMileage: "",
    kmUsedSinceLastFill: "",
    litresFilled: "",
    randValue: "",
    garageName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [suggestedVehicles] = useState([
    "Company Car",
    "Delivery Van",
    "Service Vehicle",
    "Manager Car",
  ]);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        date: new Date().toISOString().split("T")[0],
        vehicle: "",
        currentMileage: "",
        kmUsedSinceLastFill: "",
        litresFilled: "",
        randValue: "",
        garageName: "",
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vehicle.trim()) newErrors.vehicle = "Vehicle is required";
    if (!formData.currentMileage.trim())
      newErrors.currentMileage = "Current mileage is required";
    if (!formData.kmUsedSinceLastFill.trim())
      newErrors.kmUsedSinceLastFill = "Kilometers used is required";
    if (!formData.litresFilled.trim())
      newErrors.litresFilled = "Litres filled is required";
    if (!formData.randValue.trim()) newErrors.randValue = "Cost is required";
    if (!formData.garageName.trim())
      newErrors.garageName = "Garage name is required";

    // Validate numeric values
    const mileage = parseFloat(formData.currentMileage);
    if (mileage < 0) newErrors.currentMileage = "Mileage cannot be negative";

    const kmUsed = parseFloat(formData.kmUsedSinceLastFill);
    if (kmUsed < 0)
      newErrors.kmUsedSinceLastFill = "Kilometers used cannot be negative";

    const litres = parseFloat(formData.litresFilled);
    if (litres <= 0 || litres > 1000)
      newErrors.litresFilled = "Litres must be between 0.01 and 1000";

    const cost = parseFloat(formData.randValue);
    if (cost <= 0) newErrors.randValue = "Cost must be greater than 0";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateEfficiency = () => {
    const litres = parseFloat(formData.litresFilled) || 0;
    const kmUsed = parseFloat(formData.kmUsedSinceLastFill) || 0;
    const cost = parseFloat(formData.randValue) || 0;

    if (litres <= 0 || kmUsed <= 0 || cost <= 0) {
      return {
        costPerLitre: 0,
        kmPerLitre: 0,
        costPerKm: 0,
      };
    }

    return {
      costPerLitre: cost / litres,
      kmPerLitre: kmUsed / litres,
      costPerKm: cost / kmUsed,
    };
  };

  const efficiency = calculateEfficiency();

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await fetch("/api/fuel", {
        method: "POST",
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
        onSuccess();
        onClose();
      } else {
        // Handle API validation errors
        if (data.details && Array.isArray(data.details)) {
          const apiErrors: Record<string, string> = {};
          data.details.forEach((error: string) => {
            if (error.includes("vehicle")) apiErrors.vehicle = error;
            else if (error.includes("mileage"))
              apiErrors.currentMileage = error;
            else if (error.includes("kilometers"))
              apiErrors.kmUsedSinceLastFill = error;
            else if (error.includes("litres")) apiErrors.litresFilled = error;
            else if (error.includes("cost") || error.includes("rand"))
              apiErrors.randValue = error;
            else if (error.includes("garage")) apiErrors.garageName = error;
          });
          setErrors(apiErrors);
        } else {
          alert(data.error || "Failed to create fuel record");
        }
      }
    } catch (error) {
      console.error("Error creating fuel record:", error);
      alert("Failed to create fuel record");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b bg-white rounded-t-2xl">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Add Fuel Record
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Record vehicle fuel consumption
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
                      setFormData((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.vehicle ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                </div>
                {errors.vehicle && (
                  <p className="mt-1 text-sm text-red-600">{errors.vehicle}</p>
                )}
                {/* Suggested vehicles */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {suggestedVehicles.map((vehicle) => (
                    <button
                      key={vehicle}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, vehicle }))
                      }
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200">
                      {vehicle}
                    </button>
                  ))}
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.currentMileage
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                  />
                </div>
                {errors.currentMileage && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.currentMileage}
                  </p>
                )}
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.kmUsedSinceLastFill
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                  />
                </div>
                {errors.kmUsedSinceLastFill && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.kmUsedSinceLastFill}
                  </p>
                )}
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.litresFilled ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                </div>
                {errors.litresFilled && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.litresFilled}
                  </p>
                )}
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.randValue ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                </div>
                {errors.randValue && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.randValue}
                  </p>
                )}
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.garageName ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                </div>
                {errors.garageName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.garageName}
                  </p>
                )}
              </div>

              {/* Efficiency Preview */}
              {efficiency.costPerLitre > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Efficiency Preview
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Cost/Litre</div>
                      <div className="font-bold text-blue-600">
                        {efficiency.costPerLitre.toLocaleString("en-ZA", {
                          style: "currency",
                          currency: "ZAR",
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Km/Litre</div>
                      <div className="font-bold text-green-600">
                        {efficiency.kmPerLitre.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Cost/Km</div>
                      <div className="font-bold text-amber-600">
                        {efficiency.costPerKm.toLocaleString("en-ZA", {
                          style: "currency",
                          currency: "ZAR",
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6">
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
                  Add Record
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditFuelModal = ({
  isOpen,
  onClose,
  record,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  record: FuelRecord | null;
  onSuccess: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    vehicle: "",
    currentMileage: "",
    kmUsedSinceLastFill: "",
    litresFilled: "",
    randValue: "",
    garageName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (record && isOpen) {
      setFormData({
        date: record.date.split("T")[0],
        vehicle: record.vehicle,
        currentMileage: record.currentMileage.toString(),
        kmUsedSinceLastFill: record.kmUsedSinceLastFill.toString(),
        litresFilled: record.litresFilled.toString(),
        randValue: record.randValue.toString(),
        garageName: record.garageName,
      });
      setErrors({});
    }
  }, [record, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vehicle.trim()) newErrors.vehicle = "Vehicle is required";
    if (!formData.currentMileage.trim())
      newErrors.currentMileage = "Current mileage is required";
    if (!formData.kmUsedSinceLastFill.trim())
      newErrors.kmUsedSinceLastFill = "Kilometers used is required";
    if (!formData.litresFilled.trim())
      newErrors.litresFilled = "Litres filled is required";
    if (!formData.randValue.trim()) newErrors.randValue = "Cost is required";
    if (!formData.garageName.trim())
      newErrors.garageName = "Garage name is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!record || !validateForm()) return;

    try {
      setLoading(true);
      const response = await fetch("/api/fuel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record._id,
          ...formData,
          currentMileage: parseFloat(formData.currentMileage),
          kmUsedSinceLastFill: parseFloat(formData.kmUsedSinceLastFill),
          litresFilled: parseFloat(formData.litresFilled),
          randValue: parseFloat(formData.randValue),
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || "Failed to update fuel record");
      }
    } catch (error) {
      console.error("Error updating fuel record:", error);
      alert("Failed to update fuel record");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b bg-white rounded-t-2xl">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Edit Fuel Record
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {record.vehicle} • {record.formattedDate}
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
                      setFormData((prev) => ({ ...prev, date: e.target.value }))
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
                <input
                  type="text"
                  value={formData.vehicle}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      vehicle: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {errors.vehicle && (
                  <p className="mt-1 text-sm text-red-600">{errors.vehicle}</p>
                )}
              </div>

              {/* Current Mileage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Mileage (km)
                </label>
                <input
                  type="number"
                  value={formData.currentMileage}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      currentMileage: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {errors.currentMileage && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.currentMileage}
                  </p>
                )}
              </div>

              {/* Kilometers Used */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kilometers Used
                </label>
                <input
                  type="number"
                  value={formData.kmUsedSinceLastFill}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      kmUsedSinceLastFill: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {errors.kmUsedSinceLastFill && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.kmUsedSinceLastFill}
                  </p>
                )}
              </div>

              {/* Litres Filled */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Litres Filled
                </label>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {errors.litresFilled && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.litresFilled}
                  </p>
                )}
              </div>

              {/* Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Cost (ZAR)
                </label>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {errors.randValue && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.randValue}
                  </p>
                )}
              </div>

              {/* Garage Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Garage Name
                </label>
                <input
                  type="text"
                  value={formData.garageName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      garageName: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {errors.garageName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.garageName}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6">
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
                  Update Record
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
  record,
}: {
  isOpen: boolean;
  onClose: () => void;
  record: FuelRecord | null;
}) => {
  if (!isOpen || !record) return null;

  const actions = [
    {
      icon: Copy,
      label: "Duplicate Record",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      action: () => {
        // Implement duplicate
        onClose();
      },
    },
    {
      icon: Printer,
      label: "Print Receipt",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      action: () => {
        // Implement print
        onClose();
      },
    },
    {
      icon: Calculator,
      label: "Calculate Efficiency",
      color: "text-green-600",
      bgColor: "bg-green-50",
      action: () => {
        // Implement calculation
        onClose();
      },
    },
    {
      icon: Share2,
      label: "Share Record",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
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
            <p className="text-sm text-gray-600 mt-1">
              {record.vehicle} • {record.formattedDate}
            </p>
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

// Efficiency Indicator Component
const EfficiencyIndicator = ({ kmPerLitre }: { kmPerLitre: number }) => {
  if (kmPerLitre >= 15) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        <TrendUp className="w-3 h-3 mr-1" />
        Excellent ({kmPerLitre.toFixed(1)} km/l)
      </span>
    );
  } else if (kmPerLitre >= 10) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
        <Activity className="w-3 h-3 mr-1" />
        Good ({kmPerLitre.toFixed(1)} km/l)
      </span>
    );
  } else if (kmPerLitre >= 5) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
        <AlertCircle className="w-3 h-3 mr-1" />
        Average ({kmPerLitre.toFixed(1)} km/l)
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
        <TrendDown className="w-3 h-3 mr-1" />
        Poor ({kmPerLitre.toFixed(1)} km/l)
      </span>
    );
  }
};

// Mobile Floating Action Button
const FloatingActionButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-6 z-40 md:hidden w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 flex items-center justify-center">
    <Plus className="w-6 h-6" />
  </button>
);

// Main Page Component
export default function FuelPage() {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [summary, setSummary] = useState<FuelSummary | null>(null);
  const [vehicleMetrics, setVehicleMetrics] = useState<VehicleMetrics[]>([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FuelRecord | null>(null);

  const itemsPerPage = 20;

  const fetchFuelRecords = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: sortField,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedVehicle !== "all" && { vehicle: selectedVehicle }),
        includeMetrics: "true",
      });

      const response = await fetch(`/api/fuel?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.data);
        setSummary(data.summary);
        setVehicleMetrics(data.metrics || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching fuel records:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortField, sortOrder, searchTerm, selectedVehicle]);

  useEffect(() => {
    fetchFuelRecords();
  }, [fetchFuelRecords]);

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
    setShowEditModal(true);
  };

  const handleOpenQuickActions = (record: FuelRecord) => {
    setSelectedRecord(record);
    setShowQuickActionsModal(true);
  };

  const handleSuccess = () => {
    fetchFuelRecords();
  };

  const toggleSelectRecord = (recordId: string) => {
    setSelectedRecords((prev) =>
      prev.includes(recordId)
        ? prev.filter((id) => id !== recordId)
        : [...prev, recordId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map((r) => r._id));
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

  const vehicles = summary?.vehicles || [];

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
            <Download className="w-5 h-5" />
            Export Data
          </button>
          <button className="flex items-center gap-3 w-full p-3 hover:bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5" />
            Settings
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
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Fuel Management
                </h1>
                <p className="text-gray-600 text-sm">
                  Track and analyze vehicle fuel consumption
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
                className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700">
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">Add Fuel</span>
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
                placeholder="Search by vehicle or garage..."
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
                onClick={() => setSelectedVehicle("all")}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  selectedVehicle === "all"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                All Vehicles
              </button>
              {vehicles.slice(0, 4).map((vehicle) => (
                <button
                  key={vehicle}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${
                    selectedVehicle === vehicle
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}>
                  {vehicle}
                </button>
              ))}
              {vehicles.length > 4 && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  More Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Panel */}
        {showAnalytics && summary && (
          <div className="mb-6 bg-white rounded-2xl shadow p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Fuel Analytics
              </h2>
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-gray-100 rounded-lg">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Total Cost</p>
                    <p className="text-xl font-bold">
                      {summary.formattedTotalFuelCost}
                    </p>
                  </div>
                  <DollarSign className="w-6 h-6 text-blue-500" />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Total Litres</p>
                    <p className="text-xl font-bold">
                      {summary.totalLitres.toFixed(1)} L
                    </p>
                  </div>
                  <Droplets className="w-6 h-6 text-green-500" />
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600">Avg Cost/Litre</p>
                    <p className="text-xl font-bold">
                      {summary.formattedAvgCostPerLitre}
                    </p>
                  </div>
                  <Fuel className="w-6 h-6 text-purple-500" />
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600">Avg Km/Litre</p>
                    <p className="text-xl font-bold">{summary.avgKmPerLitre}</p>
                  </div>
                  <Gauge className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </div>

            {/* Vehicle Metrics */}
            {vehicleMetrics.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Vehicle Performance
                </h3>
                <div className="space-y-3">
                  {vehicleMetrics.map((metric) => (
                    <div key={metric.vehicle} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{metric.vehicle}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {metric.recordCount} fills
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Total Cost</div>
                          <div className="font-medium">
                            {metric.formattedTotalFuelCost}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Avg Km/L</div>
                          <div className="font-medium">
                            {metric.avgKmPerLitre}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Cost/Km</div>
                          <div className="font-medium">
                            {metric.formattedAvgCostPerKm}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fuel Records List/Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading fuel records...</p>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
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
        ) : viewMode === "grid" ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.map((record) => (
              <div
                key={record._id}
                className="bg-white rounded-xl shadow hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="w-4 h-4 text-gray-500" />
                        <h3 className="font-bold text-gray-900">
                          {record.vehicle}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        {record.formattedDate}
                      </p>
                    </div>
                    <EfficiencyIndicator kmPerLitre={record.kmPerLitre} />
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Garage:</span>
                      <span className="font-medium">{record.garageName}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Litres:</span>
                      <span className="font-medium">
                        {record.litresFilled} L
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Cost:</span>
                      <span className="font-bold text-blue-600">
                        {record.formattedRandValue}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Km/L:</span>
                      <span className="font-medium text-green-600">
                        {record.formattedKmPerLitre}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Cost/Km:</span>
                      <span className="font-medium text-amber-600">
                        {record.formattedCostPerKm}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-3 border-t">
                    <button
                      onClick={() => handleOpenEditModal(record)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenQuickActions(record)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRecord(record._id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                      Litres
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Efficiency
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
                        <div>
                          <div className="font-medium text-gray-900">
                            {record.formattedDate}
                          </div>
                          <div className="text-xs text-gray-500 md:hidden">
                            {record.garageName}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{record.vehicle}</div>
                        <div className="text-sm text-gray-600 md:hidden">
                          {record.litresFilled} L • {record.formattedRandValue}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="font-medium">
                          {record.litresFilled} L
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="font-bold text-blue-600">
                          {record.formattedRandValue}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <EfficiencyIndicator kmPerLitre={record.kmPerLitre} />
                          <div className="text-xs text-gray-600 hidden sm:block">
                            {record.formattedCostPerKm}/km
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(record)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenQuickActions(record)}
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

        {/* Summary Stats (Mobile Only) */}
        {summary && (
          <div className="md:hidden mt-6">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-medium text-gray-900 mb-3">Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Cost</p>
                  <p className="font-bold text-blue-600">
                    {summary.formattedTotalFuelCost}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Litres</p>
                  <p className="font-bold text-green-600">
                    {summary.totalLitres.toFixed(1)} L
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Km/L</p>
                  <p className="font-bold text-amber-600">
                    {summary.avgKmPerLitre}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Cost/Km</p>
                  <p className="font-bold text-purple-600">
                    {summary.formattedAvgCostPerKm}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button (Mobile) */}
        <FloatingActionButton onClick={() => setShowCreateModal(true)} />

        {/* Modals */}
        <CreateFuelModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSuccess}
        />

        <EditFuelModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          record={selectedRecord}
          onSuccess={handleSuccess}
        />

        <QuickActionsModal
          isOpen={showQuickActionsModal}
          onClose={() => setShowQuickActionsModal(false)}
          record={selectedRecord}
        />
      </div>
    </div>
  );
}
