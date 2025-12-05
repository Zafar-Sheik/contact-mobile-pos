// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Profile, { IProfile } from "@/lib/models/Profile";

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate South African phone number
function isValidSAPhoneNumber(phone: string): boolean {
  // South African phone numbers can be in various formats
  const phoneRegex = /^(\+27|0)[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s|-/g, ""));
}

// Helper function to validate profile data
function validateProfileData(data: any) {
  const errors: string[] = [];

  if (!data.companyName || data.companyName.trim() === "") {
    errors.push("Company name is required");
  }

  if (!data.email || data.email.trim() === "") {
    errors.push("Email is required");
  } else if (!isValidEmail(data.email)) {
    errors.push("Email format is invalid");
  }

  if (!data.phone || data.phone.trim() === "") {
    errors.push("Phone number is required");
  } else if (!isValidSAPhoneNumber(data.phone)) {
    errors.push("Phone number must be a valid South African number");
  }

  // Validate VAT bank details if provided
  if (data.VATBankDetails) {
    if (
      !data.VATBankDetails.bankName ||
      data.VATBankDetails.bankName.trim() === ""
    ) {
      errors.push("VAT Bank Details: Bank name is required");
    }
    if (
      !data.VATBankDetails.accNumber ||
      data.VATBankDetails.accNumber.trim() === ""
    ) {
      errors.push("VAT Bank Details: Account number is required");
    }
    if (
      !data.VATBankDetails.branchCode ||
      data.VATBankDetails.branchCode.trim() === ""
    ) {
      errors.push("VAT Bank Details: Branch code is required");
    }
  }

  // Validate non-VAT bank details if provided
  if (data.nonVATBankDetails) {
    if (
      !data.nonVATBankDetails.bankName ||
      data.nonVATBankDetails.bankName.trim() === ""
    ) {
      errors.push("Non-VAT Bank Details: Bank name is required");
    }
    if (
      !data.nonVATBankDetails.accNumber ||
      data.nonVATBankDetails.accNumber.trim() === ""
    ) {
      errors.push("Non-VAT Bank Details: Account number is required");
    }
    if (
      !data.nonVATBankDetails.branchCode ||
      data.nonVATBankDetails.branchCode.trim() === ""
    ) {
      errors.push("Non-VAT Bank Details: Branch code is required");
    }
  }

  return errors;
}

// Helper function to format profile response
function formatProfileResponse(profile: any) {
  return {
    ...(profile.toObject ? profile.toObject() : profile),
    formattedVATBankDetails: profile.VATBankDetails
      ? `${profile.VATBankDetails.bankName}\nAcc: ${profile.VATBankDetails.accNumber}\nBranch: ${profile.VATBankDetails.branchCode}`
      : null,
    formattedNonVATBankDetails: profile.nonVATBankDetails
      ? `${profile.nonVATBankDetails.bankName}\nAcc: ${profile.nonVATBankDetails.accNumber}\nBranch: ${profile.nonVATBankDetails.branchCode}`
      : null,
  };
}

// GET - Fetch company profile
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const profile = await Profile.findOne();

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          message: "Profile not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: formatProfileResponse(profile),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch profile",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Create company profile (only one allowed)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Check if profile already exists
    const existingProfile = await Profile.findOne();
    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          message: "Profile already exists. Use PUT to update.",
        },
        { status: 409 }
      );
    }

    // Validate data
    const validationErrors = validateProfileData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    // Create profile
    const profile = await Profile.create({
      companyName: body.companyName.trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone.trim(),
      VATNo: body.VATNo?.trim() || undefined,
      regNo: body.regNo?.trim() || undefined,
      address: body.address?.trim() || undefined,
      logo: body.logo || undefined,
      showLogoOnDocuments: body.showLogoOnDocuments ?? true,
      VATBankDetails: body.VATBankDetails || undefined,
      nonVATBankDetails: body.nonVATBankDetails || undefined,
      messages: body.messages || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Profile created successfully",
        data: formatProfileResponse(profile),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Profile POST error:", error);

    // Handle custom validation error for single profile
    if (error.message === "Only one profile document is allowed") {
      return NextResponse.json(
        {
          success: false,
          message: "Profile already exists. Use PUT to update.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create profile",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT - Update company profile
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate data
    const validationErrors = validateProfileData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    // Find and update profile
    const profile = await Profile.findOneAndUpdate(
      {},
      {
        companyName: body.companyName.trim(),
        email: body.email.toLowerCase().trim(),
        phone: body.phone.trim(),
        VATNo: body.VATNo?.trim() || undefined,
        regNo: body.regNo?.trim() || undefined,
        address: body.address?.trim() || undefined,
        logo: body.logo || undefined,
        showLogoOnDocuments: body.showLogoOnDocuments ?? true,
        VATBankDetails: body.VATBankDetails || undefined,
        nonVATBankDetails: body.nonVATBankDetails || undefined,
        messages: body.messages || undefined,
      },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          message: "Profile not found. Create one first using POST.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
        data: formatProfileResponse(profile),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update profile",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH - Partially update specific profile fields
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Only allow updates to specific fields
    const allowedFields = [
      "logo",
      "showLogoOnDocuments",
      "messages",
      "VATBankDetails",
      "nonVATBankDetails",
      "address",
    ];

    const updateData: any = {};

    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        if (key === "logo" || key === "address") {
          updateData[key] = body[key]?.trim() || undefined;
        } else {
          updateData[key] = body[key];
        }
      }
    });

    // Validate bank details if being updated
    if (updateData.VATBankDetails) {
      if (!updateData.VATBankDetails.bankName?.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "VAT Bank Details: Bank name is required",
          },
          { status: 400 }
        );
      }
      if (!updateData.VATBankDetails.accNumber?.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "VAT Bank Details: Account number is required",
          },
          { status: 400 }
        );
      }
      if (!updateData.VATBankDetails.branchCode?.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "VAT Bank Details: Branch code is required",
          },
          { status: 400 }
        );
      }
    }

    if (updateData.nonVATBankDetails) {
      if (!updateData.nonVATBankDetails.bankName?.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "Non-VAT Bank Details: Bank name is required",
          },
          { status: 400 }
        );
      }
      if (!updateData.nonVATBankDetails.accNumber?.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "Non-VAT Bank Details: Account number is required",
          },
          { status: 400 }
        );
      }
      if (!updateData.nonVATBankDetails.branchCode?.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "Non-VAT Bank Details: Branch code is required",
          },
          { status: 400 }
        );
      }
    }

    // Update profile with only allowed fields
    const profile = await Profile.findOneAndUpdate({}, updateData, {
      new: true,
      runValidators: true,
    });

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          message: "Profile not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
        data: formatProfileResponse(profile),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update profile",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
