// app/api/client/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Client, { IClient } from "@/lib/models/Client";
import { Types } from "mongoose";

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate South African cell number
function isValidSACellNumber(cellNo: string): boolean {
  // South African cell numbers start with 0 followed by 6-9 and have 10 digits total
  const cellRegex = /^0[6-9][0-9]{8}$/;
  return cellRegex.test(cellNo.replace(/\s/g, ""));
}

// GET - Fetch all clients with optional query parameters
export async function GET(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const priceCategory = searchParams.get("priceCategory");
    const activeOnly = searchParams.get("activeOnly") !== "false"; // Default true

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { customerCode: { $regex: search, $options: "i" } },
        { owner: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (priceCategory) {
      query.priceCategory = priceCategory;
    }

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder;

    // Execute queries
    const [clients, totalCount] = await Promise.all([
      Client.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Client.countDocuments(query),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Add formatted credit limit for each client
    const clientsWithFormattedData = clients.map((client) => ({
      ...client,
      formattedCreditLimit: client.creditLimit.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      _id: client._id.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: clientsWithFormattedData,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch clients",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new client
export async function POST(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();

    // Validation
    const requiredFields = [
      "customerCode",
      "companyName",
      "owner",
      "address",
      "cellNo",
      "email",
      "priceCategory",
    ];

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

    // Validate email
    if (!isValidEmail(body.email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email format",
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

    // Validate price category
    const validPriceCategories = ["A", "B", "C", "D", "E"];
    if (!validPriceCategories.includes(body.priceCategory)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid price category. Must be A, B, C, D, or E",
        },
        { status: 400 }
      );
    }

    // Validate credit limit
    const creditLimit = parseFloat(body.creditLimit);
    if (isNaN(creditLimit) || creditLimit < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Credit limit must be a positive number",
        },
        { status: 400 }
      );
    }

    // Check if customer code already exists
    const existingClient = await Client.findOne({
      customerCode: body.customerCode.toUpperCase(),
    });

    if (existingClient) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer code already exists",
        },
        { status: 409 }
      );
    }

    // Check if email already exists
    const existingEmail = await Client.findOne({
      email: body.email.toLowerCase(),
    });

    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Email already registered",
        },
        { status: 409 }
      );
    }

    // Prepare client data
    const clientData = {
      customerCode: body.customerCode.toUpperCase().trim(),
      companyName: body.companyName.trim(),
      owner: body.owner.trim(),
      address: body.address.trim(),
      cellNo: body.cellNo.trim(),
      email: body.email.toLowerCase().trim(),
      VATNo: body.VATNo?.trim(),
      regNo: body.regNo?.trim(),
      priceCategory: body.priceCategory,
      creditLimit: creditLimit,
    };

    // Create new client
    const client = await Client.create(clientData);

    // Convert to plain object and add formatted fields
    const clientResponse = client.toObject();
    clientResponse.formattedCreditLimit = client.creditLimit.toLocaleString(
      "en-ZA",
      {
        style: "currency",
        currency: "ZAR",
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Client created successfully",
        data: clientResponse,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating client:", error);

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
        error: "Failed to create client",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Update an existing client
export async function PUT(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Client ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid client ID format",
        },
        { status: 400 }
      );
    }

    // Check if client exists
    const existingClient = await Client.findById(id);
    if (!existingClient) {
      return NextResponse.json(
        {
          success: false,
          error: "Client not found",
        },
        { status: 404 }
      );
    }

    // Validate email if provided
    if (updateData.email && !isValidEmail(updateData.email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email format",
        },
        { status: 400 }
      );
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

    // Validate price category if provided
    if (updateData.priceCategory) {
      const validPriceCategories = ["A", "B", "C", "D", "E"];
      if (!validPriceCategories.includes(updateData.priceCategory)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid price category",
          },
          { status: 400 }
        );
      }
    }

    // Validate credit limit if provided
    if (updateData.creditLimit !== undefined) {
      const creditLimit = parseFloat(updateData.creditLimit);
      if (isNaN(creditLimit) || creditLimit < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Credit limit must be a positive number",
          },
          { status: 400 }
        );
      }
      updateData.creditLimit = creditLimit;
    }

    // Check for duplicate customer code if being updated
    if (updateData.customerCode) {
      updateData.customerCode = updateData.customerCode.toUpperCase().trim();
      const duplicateCode = await Client.findOne({
        customerCode: updateData.customerCode,
        _id: { $ne: id },
      });

      if (duplicateCode) {
        return NextResponse.json(
          {
            success: false,
            error: "Customer code already exists",
          },
          { status: 409 }
        );
      }
    }

    // Check for duplicate email if being updated
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
      const duplicateEmail = await Client.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });

      if (duplicateEmail) {
        return NextResponse.json(
          {
            success: false,
            error: "Email already registered",
          },
          { status: 409 }
        );
      }
    }

    // Trim string fields
    const stringFields = ["companyName", "owner", "address", "VATNo", "regNo"];
    stringFields.forEach((field) => {
      if (updateData[field]) {
        updateData[field] = updateData[field].trim();
      }
    });

    // Update client
    const updatedClient = await Client.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // Add formatted credit limit
    const clientResponse = {
      ...updatedClient,
      formattedCreditLimit: updatedClient!.creditLimit.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
    };

    return NextResponse.json({
      success: true,
      message: "Client updated successfully",
      data: clientResponse,
    });
  } catch (error: any) {
    console.error("Error updating client:", error);

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
        error: "Failed to update client",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a client
export async function DELETE(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Client ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid client ID format",
        },
        { status: 400 }
      );
    }

    // Check if client exists
    const existingClient = await Client.findById(id);
    if (!existingClient) {
      return NextResponse.json(
        {
          success: false,
          error: "Client not found",
        },
        { status: 404 }
      );
    }

    // Delete client
    await Client.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting client:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete client",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH - Partial update (for specific fields like credit limit)
export async function PATCH(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Client ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid client ID format",
        },
        { status: 400 }
      );
    }

    // Check if client exists
    const existingClient = await Client.findById(id);
    if (!existingClient) {
      return NextResponse.json(
        {
          success: false,
          error: "Client not found",
        },
        { status: 404 }
      );
    }

    // Validate specific fields if provided
    if (updateData.email && !isValidEmail(updateData.email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email format",
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

    if (updateData.priceCategory) {
      const validPriceCategories = ["A", "B", "C", "D", "E"];
      if (!validPriceCategories.includes(updateData.priceCategory)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid price category",
          },
          { status: 400 }
        );
      }
    }

    if (updateData.creditLimit !== undefined) {
      const creditLimit = parseFloat(updateData.creditLimit);
      if (isNaN(creditLimit) || creditLimit < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Credit limit must be a positive number",
          },
          { status: 400 }
        );
      }
      updateData.creditLimit = creditLimit;
    }

    // Update client with only provided fields
    const updatedClient = await Client.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // Add formatted credit limit
    const clientResponse = {
      ...updatedClient,
      formattedCreditLimit: updatedClient!.creditLimit.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
    };

    return NextResponse.json({
      success: true,
      message: "Client updated successfully",
      data: clientResponse,
    });
  } catch (error: any) {
    console.error("Error patching client:", error);

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
        error: "Failed to update client",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
