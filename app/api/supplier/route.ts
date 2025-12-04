// app/api/supplier/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Supplier, { ISupplier } from "@/lib/models/Supplier";
import { Types } from "mongoose";

// Helper function to validate South African cell number
function isValidSACellNumber(cellNo: string): boolean {
  // South African cell numbers start with 0 followed by 6-9 and have 10 digits total
  const cellRegex = /^0[6-9][0-9]{8}$/;
  return cellRegex.test(cellNo.replace(/\s/g, ""));
}

// Helper function to validate supplier code format
function isValidSupplierCode(code: string): boolean {
  // Alphanumeric, can include hyphens and underscores
  const codeRegex = /^[A-Z0-9_-]+$/;
  return codeRegex.test(code);
}

// GET - Fetch all suppliers or single supplier
export async function GET(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const code = searchParams.get("code");

    // If ID or code is provided, fetch single supplier
    if (id || code) {
      return await getSingleSupplier(id, code);
    }

    // Otherwise fetch all suppliers with filters
    return await getAllSuppliers(request);
  } catch (error) {
    console.error("Error in GET handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to get all suppliers
async function getAllSuppliers(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const sortBy = searchParams.get("sortBy") || "name";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;
  const hasContraAccount = searchParams.get("hasContraAccount");

  const skip = (page - 1) * limit;

  // Build query
  const query: any = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { supplierCode: { $regex: search, $options: "i" } },
      { address: { $regex: search, $options: "i" } },
      { cellNo: { $regex: search, $options: "i" } },
    ];
  }

  if (hasContraAccount !== null) {
    query.contraAccount = hasContraAccount === "true";
  }

  // Sorting
  const sort: any = {};
  sort[sortBy] = sortOrder;

  // Execute queries
  const [suppliers, totalCount] = await Promise.all([
    Supplier.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Supplier.countDocuments(query),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / limit);

  // Format response data
  const formattedSuppliers = suppliers.map((supplier) => ({
    ...supplier,
    _id: supplier._id.toString(),
    formattedAddress: supplier.address.split("\n").join(", "),
  }));

  return NextResponse.json({
    success: true,
    data: formattedSuppliers,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    meta: {
      hasContraAccountCount: await Supplier.countDocuments({
        contraAccount: true,
      }),
      totalSuppliers: totalCount,
    },
  });
}

// Helper function to get single supplier
async function getSingleSupplier(id: string | null, code: string | null) {
  let query: any = {};

  if (id) {
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid supplier ID format",
        },
        { status: 400 }
      );
    }
    query._id = new Types.ObjectId(id);
  } else if (code) {
    query.supplierCode = code.toUpperCase();
  }

  const supplier = await Supplier.findOne(query).lean();

  if (!supplier) {
    return NextResponse.json(
      {
        success: false,
        error: "Supplier not found",
      },
      { status: 404 }
    );
  }

  // Get related stock items count
  const StockItem = (await import("@/lib/models/StockItem")).default;
  const stockItemsCount = await StockItem.countDocuments({
    supplier: supplier._id,
  });

  // Get related GRVs count
  const GRV = (await import("@/lib/models/GRV")).default;
  const grvCount = await GRV.countDocuments({ supplier: supplier._id });

  // Get recent payments
  const SupplierPayment = (await import("@/lib/models/SupplierPayment"))
    .default;
  const recentPayments = await SupplierPayment.find({ supplier: supplier._id })
    .sort({ date: -1 })
    .limit(5)
    .lean();

  const supplierWithDetails = {
    ...supplier,
    _id: supplier._id.toString(),
    formattedAddress: supplier.address.split("\n").join(", "),
    stats: {
      stockItems: stockItemsCount,
      grvCount,
      recentPayments: recentPayments.map((payment) => ({
        ...payment,
        _id: payment._id.toString(),
        formattedAmount: payment.amountPaid.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
      })),
    },
  };

  return NextResponse.json({
    success: true,
    data: supplierWithDetails,
  });
}

// POST - Create a new supplier
export async function POST(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();

    // Validation
    const requiredFields = ["supplierCode", "name", "address", "cellNo"];

    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          missingFields,
        },
        { status: 400 }
      );
    }

    // Validate supplier code
    if (!isValidSupplierCode(body.supplierCode)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid supplier code format. Use only uppercase letters, numbers, hyphens, and underscores",
        },
        { status: 400 }
      );
    }

    // Validate cell number
    if (!isValidSACellNumber(body.cellNo)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid South African cell number format. Must be 10 digits starting with 06-09",
        },
        { status: 400 }
      );
    }

    // Check if supplier code already exists
    const existingSupplier = await Supplier.findOne({
      supplierCode: body.supplierCode.toUpperCase(),
    });

    if (existingSupplier) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier code already exists",
        },
        { status: 409 }
      );
    }

    // Prepare supplier data
    const supplierData = {
      supplierCode: body.supplierCode.toUpperCase().trim(),
      name: body.name.trim(),
      address: body.address.trim(),
      cellNo: body.cellNo.trim(),
      contraAccount: body.contraAccount || false,
    };

    // Create new supplier
    const supplier = await Supplier.create(supplierData);

    // Convert to plain object and add formatted fields
    const supplierResponse = supplier.toObject();
    supplierResponse._id = supplierResponse._id.toString();
    supplierResponse.formattedAddress = supplier.address.split("\n").join(", ");

    return NextResponse.json(
      {
        success: true,
        message: "Supplier created successfully",
        data: supplierResponse,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating supplier:", error);

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        {
          success: false,
          error: `${field} already exists`,
        },
        { status: 409 }
      );
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create supplier",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Update an existing supplier
export async function PUT(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid supplier ID format",
        },
        { status: 400 }
      );
    }

    // Check if supplier exists
    const existingSupplier = await Supplier.findById(id);
    if (!existingSupplier) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier not found",
        },
        { status: 404 }
      );
    }

    // Validate supplier code if being updated
    if (updateData.supplierCode) {
      if (!isValidSupplierCode(updateData.supplierCode)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid supplier code format",
          },
          { status: 400 }
        );
      }

      updateData.supplierCode = updateData.supplierCode.toUpperCase().trim();

      // Check for duplicate supplier code
      const duplicateCode = await Supplier.findOne({
        supplierCode: updateData.supplierCode,
        _id: { $ne: id },
      });

      if (duplicateCode) {
        return NextResponse.json(
          {
            success: false,
            error: "Supplier code already exists",
          },
          { status: 409 }
        );
      }
    }

    // Validate cell number if provided
    if (updateData.cellNo && !isValidSACellNumber(updateData.cellNo)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid South African cell number format",
        },
        { status: 400 }
      );
    }

    // Handle contraAccount conversion
    if (updateData.contraAccount !== undefined) {
      updateData.contraAccount = Boolean(updateData.contraAccount);
    }

    // Trim string fields
    const stringFields = ["name", "address"];
    stringFields.forEach((field) => {
      if (updateData[field]) {
        updateData[field] = updateData[field].trim();
      }
    });

    // Update supplier
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const supplierResponse = {
      ...updatedSupplier,
      _id: updatedSupplier!._id.toString(),
      formattedAddress: updatedSupplier!.address.split("\n").join(", "),
    };

    return NextResponse.json({
      success: true,
      message: "Supplier updated successfully",
      data: supplierResponse,
    });
  } catch (error: any) {
    console.error("Error updating supplier:", error);

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        {
          success: false,
          error: `${field} already exists`,
        },
        { status: 409 }
      );
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update supplier",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a supplier
export async function DELETE(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid supplier ID format",
        },
        { status: 400 }
      );
    }

    // Check if supplier exists
    const existingSupplier = await Supplier.findById(id);
    if (!existingSupplier) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier not found",
        },
        { status: 404 }
      );
    }

    // Check if supplier has any associated stock items
    const StockItem = (await import("@/lib/models/StockItem")).default;
    const hasStockItems = await StockItem.exists({ supplier: id });

    if (hasStockItems) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete supplier with associated stock items. Update or remove stock items first.",
        },
        { status: 400 }
      );
    }

    // Check if supplier has any GRVs
    const GRV = (await import("@/lib/models/GRV")).default;
    const hasGRVs = await GRV.exists({ supplier: id });

    if (hasGRVs) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete supplier with existing GRVs",
        },
        { status: 400 }
      );
    }

    // Check if supplier has any payments
    const SupplierPayment = (await import("@/lib/models/SupplierPayment"))
      .default;
    const hasPayments = await SupplierPayment.exists({ supplier: id });

    if (hasPayments) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete supplier with existing payments",
        },
        { status: 400 }
      );
    }

    // Delete supplier
    await Supplier.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting supplier:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete supplier",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH - Partial update (toggle contra account status, etc.)
export async function PATCH(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid supplier ID format",
        },
        { status: 400 }
      );
    }

    // Check if supplier exists
    const existingSupplier = await Supplier.findById(id);
    if (!existingSupplier) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier not found",
        },
        { status: 404 }
      );
    }

    // Validate specific fields if provided
    if (
      updateData.supplierCode &&
      !isValidSupplierCode(updateData.supplierCode)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid supplier code format",
        },
        { status: 400 }
      );
    }

    if (updateData.cellNo && !isValidSACellNumber(updateData.cellNo)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid South African cell number format",
        },
        { status: 400 }
      );
    }

    // Handle contraAccount conversion
    if (updateData.contraAccount !== undefined) {
      updateData.contraAccount = Boolean(updateData.contraAccount);
    }

    // Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.address) updateData.address = updateData.address.trim();
    if (updateData.supplierCode)
      updateData.supplierCode = updateData.supplierCode.toUpperCase().trim();
    if (updateData.cellNo) updateData.cellNo = updateData.cellNo.trim();

    // Check for duplicate supplier code if being updated
    if (updateData.supplierCode) {
      const duplicateCode = await Supplier.findOne({
        supplierCode: updateData.supplierCode,
        _id: { $ne: id },
      });

      if (duplicateCode) {
        return NextResponse.json(
          {
            success: false,
            error: "Supplier code already exists",
          },
          { status: 409 }
        );
      }
    }

    // Update supplier with only provided fields
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const supplierResponse = {
      ...updatedSupplier,
      _id: updatedSupplier!._id.toString(),
      formattedAddress: updatedSupplier!.address.split("\n").join(", "),
    };

    return NextResponse.json({
      success: true,
      message: "Supplier updated successfully",
      data: supplierResponse,
    });
  } catch (error: any) {
    console.error("Error patching supplier:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        {
          success: false,
          error: `${field} already exists`,
        },
        { status: 409 }
      );
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update supplier",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
