// app/api/staff/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Staff from "@/lib/models/Staff";
import mongoose from "mongoose";

// Helper function to handle errors
const handleError = (error: any, message: string) => {
  console.error(message, error);

  if (error instanceof mongoose.Error.ValidationError) {
    return NextResponse.json(
      { error: "Validation Error", details: error.errors },
      { status: 400 }
    );
  }

  if (error.code === 11000) {
    return NextResponse.json(
      { error: "Duplicate key error", details: "ID Number already exists" },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { error: message, details: error.message },
    { status: 500 }
  );
};

// GET all staff members
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const paymentMethod = searchParams.get("paymentMethod");

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { IDNumber: { $regex: search, $options: "i" } },
        { cellNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // Get total count for pagination
    const total = await Staff.countDocuments(filter);

    // Get staff with pagination
    const staff = await Staff.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate virtual fields manually since .lean() doesn't include virtuals
    const staffWithVirtuals = staff.map((staffMember) => ({
      ...staffMember,
      fullName: `${staffMember.firstName} ${staffMember.lastName}`,
      totalAdjustments: staffMember.financialAdjustments
        ? staffMember.financialAdjustments.deductions +
          staffMember.financialAdjustments.advance +
          staffMember.financialAdjustments.loans
        : 0,
      formattedTotalAdjustments: staffMember.financialAdjustments
        ? (
            staffMember.financialAdjustments.deductions +
            staffMember.financialAdjustments.advance +
            staffMember.financialAdjustments.loans
          ).toLocaleString("en-ZA", {
            style: "currency",
            currency: "ZAR",
          })
        : "R 0.00",
    }));

    return NextResponse.json({
      data: staffWithVirtuals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleError(error, "Failed to fetch staff");
  }
}

// POST create a new staff member
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "IDNumber",
      "address",
      "cellNumber",
      "paymentMethod",
    ];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: "Missing required fields", fields: missingFields },
        { status: 400 }
      );
    }

    // Validate payment method
    const validPaymentMethods = ["Daily", "Weekly", "Monthly"];
    if (!validPaymentMethods.includes(body.paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method", validMethods: validPaymentMethods },
        { status: 400 }
      );
    }

    // Initialize financialAdjustments if not provided
    if (!body.financialAdjustments) {
      body.financialAdjustments = {
        deductions: 0,
        advance: 0,
        loans: 0,
      };
    }

    const staff = new Staff(body);
    await staff.save();

    // Convert to plain object and add virtuals
    const staffObj = staff.toObject();
    const responseObj = {
      ...staffObj,
      fullName: staff.fullName,
      totalAdjustments: staff.totalAdjustments,
      formattedTotalAdjustments: staff.formattedTotalAdjustments,
    };

    return NextResponse.json(
      {
        message: "Staff member created successfully",
        data: responseObj,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error, "Failed to create staff member");
  }
}

// PATCH update a staff member
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid staff ID format" },
        { status: 400 }
      );
    }

    // Check if staff exists
    const existingStaff = await Staff.findById(id);
    if (!existingStaff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Prevent updating IDNumber if it's being changed
    if (body.IDNumber && body.IDNumber !== existingStaff.IDNumber) {
      const existingWithNewID = await Staff.findOne({
        IDNumber: body.IDNumber,
      });
      if (existingWithNewID) {
        return NextResponse.json(
          { error: "ID Number already exists" },
          { status: 409 }
        );
      }
    }

    // Validate payment method if being updated
    if (body.paymentMethod) {
      const validPaymentMethods = ["Daily", "Weekly", "Monthly"];
      if (!validPaymentMethods.includes(body.paymentMethod)) {
        return NextResponse.json(
          {
            error: "Invalid payment method",
            validMethods: validPaymentMethods,
          },
          { status: 400 }
        );
      }
    }

    // Update staff
    const updatedStaff = await Staff.findByIdAndUpdate(
      id,
      { ...body, updated_at: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedStaff) {
      return NextResponse.json(
        { error: "Failed to update staff member" },
        { status: 500 }
      );
    }

    // Convert to plain object and add virtuals
    const staffObj = updatedStaff.toObject();
    const responseObj = {
      ...staffObj,
      fullName: updatedStaff.fullName,
      totalAdjustments: updatedStaff.totalAdjustments,
      formattedTotalAdjustments: updatedStaff.formattedTotalAdjustments,
    };

    return NextResponse.json({
      message: "Staff member updated successfully",
      data: responseObj,
    });
  } catch (error) {
    return handleError(error, "Failed to update staff member");
  }
}

// DELETE a staff member
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid staff ID format" },
        { status: 400 }
      );
    }

    // Check if staff exists
    const staff = await Staff.findById(id);
    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    await Staff.findByIdAndDelete(id);

    return NextResponse.json({
      message: "Staff member deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    return handleError(error, "Failed to delete staff member");
  }
}
