// app/profile/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackArrow from "../components/BackArrow";

interface IBankDetails {
  bankName: string;
  accNumber: string;
  branchCode: string;
}

interface IMessages {
  message1?: string;
  message2?: string;
  message3?: string;
}

interface IProfile {
  _id: string;
  companyName: string;
  email: string;
  phone: string;
  VATNo?: string;
  regNo?: string;
  address?: string;
  logo?: string;
  VATBankDetails?: IBankDetails;
  nonVATBankDetails?: IBankDetails;
  showLogoOnDocuments: boolean;
  messages?: IMessages;
  created_at: string;
  updated_at: string;
}

const API_URL = "/api/profile";

export default function ProfilePage() {
  const router = useRouter();

  // State
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    phone: "",
    VATNo: "",
    regNo: "",
    address: "",
    logo: "",
    showLogoOnDocuments: true,
    VATBankDetails: {
      bankName: "",
      accNumber: "",
      branchCode: "",
    },
    nonVATBankDetails: {
      bankName: "",
      accNumber: "",
      branchCode: "",
    },
    messages: {
      message1: "",
      message2: "",
      message3: "",
    },
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch profile
  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (data.success && data.data) {
        setProfile(data.data);
        setFormData({
          companyName: data.data.companyName || "",
          email: data.data.email || "",
          phone: data.data.phone || "",
          VATNo: data.data.VATNo || "",
          regNo: data.data.regNo || "",
          address: data.data.address || "",
          logo: data.data.logo || "",
          showLogoOnDocuments: data.data.showLogoOnDocuments ?? true,
          VATBankDetails: data.data.VATBankDetails || {
            bankName: "",
            accNumber: "",
            branchCode: "",
          },
          nonVATBankDetails: data.data.nonVATBankDetails || {
            bankName: "",
            accNumber: "",
            branchCode: "",
          },
          messages: data.data.messages || {
            message1: "",
            message2: "",
            message3: "",
          },
        });
      } else if (response.status === 404) {
        setProfile(null);
        setIsEditing(true);
      } else {
        setError(data.message || "Failed to fetch profile");
      }
    } catch (err) {
      setError("Failed to fetch profile");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email format is invalid";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (
      !/^(\+27|0)[0-9]{9}$/.test(formData.phone.replace(/\s|-/g, ""))
    ) {
      newErrors.phone = "Phone number must be a valid South African number";
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const method = profile ? "PUT" : "POST";
      const response = await fetch(API_URL, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setProfile(data.data);
        setIsEditing(false);
        setSuccess(data.message || "Profile saved successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "Failed to save profile");
      }
    } catch (err) {
      setError("Failed to save profile");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (profile) {
      setFormData({
        companyName: profile.companyName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        VATNo: profile.VATNo || "",
        regNo: profile.regNo || "",
        address: profile.address || "",
        logo: profile.logo || "",
        showLogoOnDocuments: profile.showLogoOnDocuments ?? true,
        VATBankDetails: profile.VATBankDetails || {
          bankName: "",
          accNumber: "",
          branchCode: "",
        },
        nonVATBankDetails: profile.nonVATBankDetails || {
          bankName: "",
          accNumber: "",
          branchCode: "",
        },
        messages: {
          message1: profile.messages?.message1 || "",
          message2: profile.messages?.message2 || "",
          message3: profile.messages?.message3 || "",
        },
      });
    }
    setIsEditing(false);
    setFormErrors({});
  };

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({
          ...formData,
          logo: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle field change
  const handleFieldChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });
    if (formErrors[field]) {
      setFormErrors({
        ...formErrors,
        [field]: "",
      });
    }
  };

  // Handle nested field change
  const handleNestedFieldChange = (
    parent: string,
    field: string,
    value: string
  ) => {
    const parentKey = parent as keyof typeof formData;
    const parentValue = formData[parentKey];

    if (typeof parentValue === "object" && parentValue !== null) {
      setFormData({
        ...formData,
        [parent]: {
          ...parentValue,
          [field]: value,
        },
      });
    }
  };

  // Initialize
  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackArrow />
            <h1 className="text-2xl font-bold text-gray-900">
              Company Profile
            </h1>
          </div>
          <div className="flex gap-2">
            {!isEditing && profile && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Edit Profile
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}
      {success && (
        <div className="max-w-7xl mx-auto px-4 py-4 mt-4">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {success}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!profile && !isEditing ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">No profile set up yet.</p>
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create Profile
            </button>
          </div>
        ) : isEditing ? (
          // Edit View
          <div className="space-y-8">
            {/* Company Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">
                Company Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) =>
                      handleFieldChange("companyName", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.companyName
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter company name"
                  />
                  {formErrors.companyName && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.companyName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter email"
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.phone ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="e.g., +27 12 345 6789"
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={formData.VATNo}
                    onChange={(e) => handleFieldChange("VATNo", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.regNo}
                    onChange={(e) => handleFieldChange("regNo", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      handleFieldChange("address", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">Company Logo</h2>
              <div className="flex gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Logo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Recommended: PNG or JPG, max 5MB
                  </p>
                </div>
                {formData.logo && (
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Preview
                    </p>
                    <img
                      src={formData.logo}
                      alt="Logo preview"
                      className="h-32 object-contain border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showLogo"
                  checked={formData.showLogoOnDocuments}
                  onChange={(e) =>
                    handleFieldChange("showLogoOnDocuments", e.target.checked)
                  }
                  className="rounded"
                />
                <label htmlFor="showLogo" className="text-sm text-gray-700">
                  Show logo on documents (invoices, quotes, etc.)
                </label>
              </div>
            </div>

            {/* VAT Bank Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">VAT Bank Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.VATBankDetails.bankName}
                    onChange={(e) =>
                      handleNestedFieldChange(
                        "VATBankDetails",
                        "bankName",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., First National Bank"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.VATBankDetails.accNumber}
                    onChange={(e) =>
                      handleNestedFieldChange(
                        "VATBankDetails",
                        "accNumber",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 62000000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Code
                  </label>
                  <input
                    type="text"
                    value={formData.VATBankDetails.branchCode}
                    onChange={(e) =>
                      handleNestedFieldChange(
                        "VATBankDetails",
                        "branchCode",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 250162"
                  />
                </div>
              </div>
            </div>

            {/* Non-VAT Bank Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">
                Non-VAT Bank Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.nonVATBankDetails.bankName}
                    onChange={(e) =>
                      handleNestedFieldChange(
                        "nonVATBankDetails",
                        "bankName",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., First National Bank"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.nonVATBankDetails.accNumber}
                    onChange={(e) =>
                      handleNestedFieldChange(
                        "nonVATBankDetails",
                        "accNumber",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 62000000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Code
                  </label>
                  <input
                    type="text"
                    value={formData.nonVATBankDetails.branchCode}
                    onChange={(e) =>
                      handleNestedFieldChange(
                        "nonVATBankDetails",
                        "branchCode",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 250162"
                  />
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">Custom Messages</h2>
              <p className="text-sm text-gray-600 mb-4">
                These messages will appear on documents like invoices and quotes
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message 1
                  </label>
                  <textarea
                    value={formData.messages.message1}
                    onChange={(e) =>
                      handleNestedFieldChange(
                        "messages",
                        "message1",
                        e.target.value
                      )
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional custom message"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message 2
                  </label>
                  <textarea
                    value={formData.messages.message2}
                    onChange={(e) =>
                      handleNestedFieldChange(
                        "messages",
                        "message2",
                        e.target.value
                      )
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional custom message"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message 3
                  </label>
                  <textarea
                    value={formData.messages.message3}
                    onChange={(e) =>
                      handleNestedFieldChange(
                        "messages",
                        "message3",
                        e.target.value
                      )
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional custom message"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // View Mode
          profile && (
            <div className="space-y-8">
              {/* Company Information Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      {profile.companyName}
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="text-lg text-gray-900">{profile.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="text-lg text-gray-900">{profile.phone}</p>
                      </div>
                      {profile.address && (
                        <div>
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="text-lg text-gray-900">
                            {profile.address}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {profile.logo && profile.showLogoOnDocuments && (
                      <div className="bg-gray-50 p-6 rounded-lg flex items-center justify-center h-full">
                        <img
                          src={profile.logo}
                          alt="Company logo"
                          className="h-40 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {profile.VATNo && (
                    <div>
                      <p className="text-sm text-gray-600">VAT Number</p>
                      <p className="text-lg font-medium text-gray-900">
                        {profile.VATNo}
                      </p>
                    </div>
                  )}
                  {profile.regNo && (
                    <div>
                      <p className="text-sm text-gray-600">
                        Registration Number
                      </p>
                      <p className="text-lg font-medium text-gray-900">
                        {profile.regNo}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.VATBankDetails && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">
                      VAT Bank Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Bank Name</p>
                        <p className="text-gray-900">
                          {profile.VATBankDetails.bankName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Account Number</p>
                        <p className="text-gray-900">
                          {profile.VATBankDetails.accNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Branch Code</p>
                        <p className="text-gray-900">
                          {profile.VATBankDetails.branchCode}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {profile.nonVATBankDetails && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">
                      Non-VAT Bank Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Bank Name</p>
                        <p className="text-gray-900">
                          {profile.nonVATBankDetails.bankName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Account Number</p>
                        <p className="text-gray-900">
                          {profile.nonVATBankDetails.accNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Branch Code</p>
                        <p className="text-gray-900">
                          {profile.nonVATBankDetails.branchCode}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              {profile.messages &&
                (profile.messages.message1 ||
                  profile.messages.message2 ||
                  profile.messages.message3) && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">
                      Custom Messages
                    </h3>
                    <div className="space-y-4">
                      {profile.messages.message1 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-gray-900 text-sm">
                            {profile.messages.message1}
                          </p>
                        </div>
                      )}
                      {profile.messages.message2 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-gray-900 text-sm">
                            {profile.messages.message2}
                          </p>
                        </div>
                      )}
                      {profile.messages.message3 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-gray-900 text-sm">
                            {profile.messages.message3}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
