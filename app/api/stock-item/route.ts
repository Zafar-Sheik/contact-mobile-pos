// app/api/stock-item/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import StockItem, { IStockItem } from "@/lib/models/StockItem";
import Supplier from "@/lib/models/Supplier";
import { Types } from "mongoose";

// Helper function to validate stock code format
function isValidStockCode(code: string): boolean {
  // Alphanumeric, can include hyphens and underscores
  const codeRegex = /^[A-Z0-9_-]+$/;
  return codeRegex.test(code);
}

// Helper function to format stock item response
function formatStockItemResponse(stockItem: any) {
  const price = stockItem.price || { cost: 0, sellingC: 0 };
  const stockLevel = stockItem.stockLevel || {
    minStockLevel: 0,
    maxStockLevel: 0,
  };

  return {
    ...stockItem,
    _id: stockItem._id?.toString ? stockItem._id.toString() : stockItem._id,
    formattedCost: (price.cost || 0).toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    formattedSellingC: (price.sellingC || 0).toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    stockStatus: getStockStatus(stockItem.qty || 0, stockLevel),
    totalValue: (stockItem.qty || 0) * (price.cost || 0),
    formattedTotalValue: (
      (stockItem.qty || 0) * (price.cost || 0)
    ).toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
  };
}

// Helper function to get stock status
function getStockStatus(
  qty: number,
  stockLevel: { minStockLevel: number; maxStockLevel: number }
) {
  if (qty <= stockLevel.minStockLevel) return "Low";
  if (qty >= stockLevel.maxStockLevel) return "High";
  return "Normal";
}

// GET - Fetch all stock items or single item
export async function GET(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const code = searchParams.get("code");

    // If ID or code is provided, fetch single stock item
    if (id || code) {
      return await getSingleStockItem(id, code);
    }

    // Otherwise fetch all stock items with filters
    return await getAllStockItems(request);
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

// Helper function to get all stock items
async function getAllStockItems(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const sortBy = searchParams.get("sortBy") || "name";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;
  const category = searchParams.get("category");
  const supplier = searchParams.get("supplier");
  const isActive = searchParams.get("isActive");
  const stockStatus = searchParams.get("stockStatus");
  const minQty = searchParams.get("minQty");
  const maxQty = searchParams.get("maxQty");

  const skip = (page - 1) * limit;

  // Build query
  const query: any = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { code: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (category) {
    query.category = category;
  }

  if (supplier && Types.ObjectId.isValid(supplier)) {
    query.supplier = new Types.ObjectId(supplier);
  }

  if (isActive !== null) {
    query.isActive = isActive === "true";
  }

  if (minQty) {
    query.qty = { $gte: parseInt(minQty) };
  }

  if (maxQty) {
    if (query.qty) {
      query.qty.$lte = parseInt(maxQty);
    } else {
      query.qty = { $lte: parseInt(maxQty) };
    }
  }

  // Sorting
  const sort: any = {};
  sort[sortBy] = sortOrder;

  // Execute queries with supplier population
  const [stockItems, totalCount] = await Promise.all([
    StockItem.find(query)
      .populate({
        path: "supplier",
        model: Supplier,
        select: "supplierCode name",
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    StockItem.countDocuments(query),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / limit);

  // Apply stock status filter after fetching
  let filteredItems = stockItems;
  if (stockStatus) {
    filteredItems = stockItems.filter((item) => {
      const status = getStockStatus(item.qty, item.stockLevel);
      return status === stockStatus;
    });
  }

  // Format response data
  const formattedItems = filteredItems.map(formatStockItemResponse);

  // Calculate summary statistics
  const summary = {
    totalItems: formattedItems.length,
    totalQty: formattedItems.reduce((sum, item) => sum + (item.qty || 0), 0),
    totalValue: formattedItems.reduce(
      (sum, item) => sum + (item.qty || 0) * (item.price?.cost || 0),
      0
    ),
    averageCost:
      formattedItems.length > 0
        ? formattedItems.reduce(
            (sum, item) => sum + (item.price?.cost || 0),
            0
          ) / formattedItems.length
        : 0,
    lowStockCount: formattedItems.filter((item) => item.stockStatus === "Low")
      .length,
    highStockCount: formattedItems.filter((item) => item.stockStatus === "High")
      .length,
  };

  // Format summary values
  const formattedSummary = {
    ...summary,
    formattedTotalValue: summary.totalValue.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    formattedAverageCost: summary.averageCost.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
  };

  return NextResponse.json({
    success: true,
    data: formattedItems,
    summary: formattedSummary,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
}

// Helper function to get single stock item
async function getSingleStockItem(id: string | null, code: string | null) {
  let query: any = {};

  if (id) {
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid stock item ID format",
        },
        { status: 400 }
      );
    }
    query._id = new Types.ObjectId(id);
  } else if (code) {
    query.code = code.toUpperCase();
  }

  const stockItem = await StockItem.findOne(query)
    .populate({
      path: "supplier",
      model: Supplier,
    })
    .lean();

  if (!stockItem) {
    return NextResponse.json(
      {
        success: false,
        error: "Stock item not found",
      },
      { status: 404 }
    );
  }

  // Get related data
  const Invoice = (await import("@/lib/models/Invoice")).default;
  const recentInvoices = await Invoice.aggregate([
    { $unwind: "$items" },
    { $match: { "items.stockItem": stockItem._id } },
    { $sort: { date: -1 } },
    { $limit: 5 },
    {
      $project: {
        invoiceNumber: "$number",
        date: 1,
        client: 1,
        qty: "$items.qty",
        price: "$items.price",
      },
    },
    {
      $lookup: {
        from: "clients",
        localField: "client",
        foreignField: "_id",
        as: "clientDetails",
      },
    },
    { $unwind: "$clientDetails" },
  ]);

  const GRV = (await import("@/lib/models/GRV")).default;
  const recentReceipts = await GRV.aggregate([
    { $unwind: "$itemsReceived" },
    { $match: { "itemsReceived.stockItem": stockItem._id } },
    { $sort: { date: -1 } },
    { $limit: 5 },
    {
      $project: {
        grvReference: "$GRVReference",
        date: 1,
        supplier: 1,
        qty: "$itemsReceived.qty",
        costPrice: "$itemsReceived.costPrice",
      },
    },
    {
      $lookup: {
        from: "suppliers",
        localField: "supplier",
        foreignField: "_id",
        as: "supplierDetails",
      },
    },
    { $unwind: "$supplierDetails" },
  ]);

  const stockItemWithDetails = {
    ...formatStockItemResponse(stockItem),
    recentActivity: {
      invoices: recentInvoices.map((inv) => ({
        ...inv,
        _id: inv._id.toString(),
        formattedPrice: inv.price.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
        clientName: inv.clientDetails.companyName,
      })),
      receipts: recentReceipts.map((rec) => ({
        ...rec,
        _id: rec._id.toString(),
        formattedCostPrice: rec.costPrice.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
        supplierName: rec.supplierDetails.name,
      })),
    },
  };

  return NextResponse.json({
    success: true,
    data: stockItemWithDetails,
  });
}

// POST - Create a new stock item
export async function POST(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();

    // Validation
    const requiredFields = ["code", "name", "price", "stockLevel"];

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

    // Validate stock code
    if (!isValidStockCode(body.code)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid stock code format. Use only uppercase letters, numbers, hyphens, and underscores",
        },
        { status: 400 }
      );
    }

    // Validate price object
    if (
      !body.price.cost ||
      !body.price.sellingC ||
      body.price.VAT === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Price object must include cost, sellingC, and VAT",
        },
        { status: 400 }
      );
    }

    // Validate stock level object
    if (!body.stockLevel.minStockLevel || !body.stockLevel.maxStockLevel) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Stock level object must include minStockLevel and maxStockLevel",
        },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (
      body.price.cost < 0 ||
      body.price.sellingC < 0 ||
      body.price.VAT < 0 ||
      body.price.VAT > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Price values must be positive and VAT must be between 0-100%",
        },
        { status: 400 }
      );
    }

    if (body.qty !== undefined && body.qty < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity cannot be negative",
        },
        { status: 400 }
      );
    }

    if (
      body.stockLevel.minStockLevel < 0 ||
      body.stockLevel.maxStockLevel < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Stock levels cannot be negative",
        },
        { status: 400 }
      );
    }

    if (body.stockLevel.minStockLevel >= body.stockLevel.maxStockLevel) {
      return NextResponse.json(
        {
          success: false,
          error: "Minimum stock level must be less than maximum stock level",
        },
        { status: 400 }
      );
    }

    // Check if stock code already exists
    const existingItem = await StockItem.findOne({
      code: body.code.toUpperCase(),
    });

    if (existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: "Stock code already exists",
        },
        { status: 409 }
      );
    }

    // Validate supplier if provided
    if (body.supplier && !Types.ObjectId.isValid(body.supplier)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid supplier ID format",
        },
        { status: 400 }
      );
    }

    // Prepare stock item data
    const stockItemData = {
      code: body.code.toUpperCase().trim(),
      name: body.name.trim(),
      qty: body.qty || 0,
      category: body.category?.trim(),
      description: body.description?.trim(),
      dimensions: Array.isArray(body.dimensions)
        ? body.dimensions.map((d: string) => d.trim())
        : [],
      supplier: body.supplier ? new Types.ObjectId(body.supplier) : undefined,
      price: {
        cost: parseFloat(body.price.cost),
        sellingC: parseFloat(body.price.sellingC),
        VAT: parseFloat(body.price.VAT),
      },
      priceCategory: body.priceCategory
        ? {
            sellingA: body.priceCategory.sellingA
              ? parseFloat(body.priceCategory.sellingA)
              : undefined,
            sellingB: body.priceCategory.sellingB
              ? parseFloat(body.priceCategory.sellingB)
              : undefined,
            sellingD: body.priceCategory.sellingD
              ? parseFloat(body.priceCategory.sellingD)
              : undefined,
            sellingE: body.priceCategory.sellingE
              ? parseFloat(body.priceCategory.sellingE)
              : undefined,
          }
        : undefined,
      stockLevel: {
        minStockLevel: parseInt(body.stockLevel.minStockLevel),
        maxStockLevel: parseInt(body.stockLevel.maxStockLevel),
      },
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      image: body.image,
    };

    // Create new stock item
    const stockItem = await StockItem.create(stockItemData);

    // Convert to plain object and format response
    const populatedItem = await StockItem.findById(stockItem._id)
      .populate({
        path: "supplier",
        model: Supplier,
        select: "supplierCode name",
      })
      .lean();

    const stockItemResponse = formatStockItemResponse(populatedItem);

    return NextResponse.json(
      {
        success: true,
        message: "Stock item created successfully",
        data: stockItemResponse,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating stock item:", error);

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
        error: "Failed to create stock item",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Update an existing stock item
export async function PUT(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Stock item ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid stock item ID format",
        },
        { status: 400 }
      );
    }

    // Check if stock item exists
    const existingItem = await StockItem.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: "Stock item not found",
        },
        { status: 404 }
      );
    }

    // Validate stock code if being updated
    if (updateData.code) {
      if (!isValidStockCode(updateData.code)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid stock code format",
          },
          { status: 400 }
        );
      }

      updateData.code = updateData.code.toUpperCase().trim();

      // Check for duplicate stock code
      const duplicateCode = await StockItem.findOne({
        code: updateData.code,
        _id: { $ne: id },
      });

      if (duplicateCode) {
        return NextResponse.json(
          {
            success: false,
            error: "Stock code already exists",
          },
          { status: 409 }
        );
      }
    }

    // Validate supplier if provided
    if (updateData.supplier && !Types.ObjectId.isValid(updateData.supplier)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid supplier ID format",
        },
        { status: 400 }
      );
    }

    // Handle price updates
    if (updateData.price) {
      const priceUpdate: any = {};

      if (updateData.price.cost !== undefined) {
        if (updateData.price.cost < 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Cost price cannot be negative",
            },
            { status: 400 }
          );
        }
        priceUpdate["price.cost"] = parseFloat(updateData.price.cost);
      }

      if (updateData.price.sellingC !== undefined) {
        if (updateData.price.sellingC < 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Selling price cannot be negative",
            },
            { status: 400 }
          );
        }
        priceUpdate["price.sellingC"] = parseFloat(updateData.price.sellingC);
      }

      if (updateData.price.VAT !== undefined) {
        if (updateData.price.VAT < 0 || updateData.price.VAT > 100) {
          return NextResponse.json(
            {
              success: false,
              error: "VAT must be between 0-100%",
            },
            { status: 400 }
          );
        }
        priceUpdate["price.VAT"] = parseFloat(updateData.price.VAT);
      }

      updateData.price = priceUpdate;
    }

    // Handle price category updates
    if (updateData.priceCategory) {
      const priceCategoryUpdate: any = {};

      ["sellingA", "sellingB", "sellingD", "sellingE"].forEach((field) => {
        if (updateData.priceCategory[field] !== undefined) {
          if (updateData.priceCategory[field] < 0) {
            throw new Error(`${field} cannot be negative`);
          }
          priceCategoryUpdate[`priceCategory.${field}`] = parseFloat(
            updateData.priceCategory[field]
          );
        }
      });

      updateData.priceCategory = priceCategoryUpdate;
    }

    // Handle stock level updates
    if (updateData.stockLevel) {
      const stockLevelUpdate: any = {};

      if (updateData.stockLevel.minStockLevel !== undefined) {
        if (updateData.stockLevel.minStockLevel < 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Minimum stock level cannot be negative",
            },
            { status: 400 }
          );
        }
        stockLevelUpdate["stockLevel.minStockLevel"] = parseInt(
          updateData.stockLevel.minStockLevel
        );
      }

      if (updateData.stockLevel.maxStockLevel !== undefined) {
        if (updateData.stockLevel.maxStockLevel < 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Maximum stock level cannot be negative",
            },
            { status: 400 }
          );
        }
        stockLevelUpdate["stockLevel.maxStockLevel"] = parseInt(
          updateData.stockLevel.maxStockLevel
        );
      }

      // Validate min < max if both are being updated
      if (
        stockLevelUpdate["stockLevel.minStockLevel"] !== undefined &&
        stockLevelUpdate["stockLevel.maxStockLevel"] !== undefined &&
        stockLevelUpdate["stockLevel.minStockLevel"] >=
          stockLevelUpdate["stockLevel.maxStockLevel"]
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Minimum stock level must be less than maximum stock level",
          },
          { status: 400 }
        );
      }

      updateData.stockLevel = stockLevelUpdate;
    }

    // Validate quantity if being updated
    if (updateData.qty !== undefined) {
      if (updateData.qty < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Quantity cannot be negative",
          },
          { status: 400 }
        );
      }
      updateData.qty = parseInt(updateData.qty);
    }

    // Handle isActive conversion
    if (updateData.isActive !== undefined) {
      updateData.isActive = Boolean(updateData.isActive);
    }

    // Trim string fields
    const stringFields = ["name", "category", "description"];
    stringFields.forEach((field) => {
      if (updateData[field]) {
        updateData[field] = updateData[field].trim();
      }
    });

    // Handle dimensions array
    if (updateData.dimensions && Array.isArray(updateData.dimensions)) {
      updateData.dimensions = updateData.dimensions.map((d: string) =>
        d.trim()
      );
    }

    // Prepare update object with dot notation for nested fields
    const updateObject: any = {};
    Object.keys(updateData).forEach((key) => {
      if (
        typeof updateData[key] === "object" &&
        !Array.isArray(updateData[key])
      ) {
        // Handle nested objects (price, priceCategory, stockLevel)
        Object.keys(updateData[key]).forEach((nestedKey) => {
          updateObject[`${key}.${nestedKey}`] = updateData[key][nestedKey];
        });
      } else {
        updateObject[key] = updateData[key];
      }
    });

    // Update stock item
    const updatedItem = await StockItem.findByIdAndUpdate(
      id,
      { $set: updateObject },
      { new: true, runValidators: true }
    )
      .populate({
        path: "supplier",
        model: Supplier,
        select: "supplierCode name",
      })
      .lean();

    // Format response
    const stockItemResponse = formatStockItemResponse(updatedItem);

    return NextResponse.json({
      success: true,
      message: "Stock item updated successfully",
      data: stockItemResponse,
    });
  } catch (error: any) {
    console.error("Error updating stock item:", error);

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
        error: "Failed to update stock item",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a stock item
export async function DELETE(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Stock item ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid stock item ID format",
        },
        { status: 400 }
      );
    }

    // Check if stock item exists
    const existingItem = await StockItem.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: "Stock item not found",
        },
        { status: 404 }
      );
    }

    // Check if stock item is used in any invoices
    const Invoice = (await import("@/lib/models/Invoice")).default;
    const hasInvoices = await Invoice.exists({ "items.stockItem": id });

    if (hasInvoices) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete stock item used in invoices. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    // Check if stock item is used in any quotes
    const Quote = (await import("@/lib/models/Quote")).default;
    const hasQuotes = await Quote.exists({ "quoteItems.stockItem": id });

    if (hasQuotes) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete stock item used in quotes. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    // Check if stock item is used in any workflows
    const Workflow = (await import("@/lib/models/Workflow")).default;
    const hasWorkflows = await Workflow.exists({ "stockItems.stockItem": id });

    if (hasWorkflows) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete stock item used in workflows. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    // Check if stock item is used in any GRVs
    const GRV = (await import("@/lib/models/GRV")).default;
    const hasGRVs = await GRV.exists({ "itemsReceived.stockItem": id });

    if (hasGRVs) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete stock item used in GRVs. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    // Delete stock item
    await StockItem.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Stock item deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting stock item:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete stock item",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH - Partial update (update quantity, toggle active status, etc.)
export async function PATCH(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Stock item ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid stock item ID format",
        },
        { status: 400 }
      );
    }

    // Check if stock item exists
    const existingItem = await StockItem.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: "Stock item not found",
        },
        { status: 404 }
      );
    }

    // Handle specific field validations

    // Update quantity (with increment/decrement support)
    if (updateData.qty !== undefined) {
      if (typeof updateData.qty === "number") {
        const newQty = existingItem.qty + updateData.qty;
        if (newQty < 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Quantity cannot be negative",
            },
            { status: 400 }
          );
        }
        updateData.qty = newQty;
      } else if (updateData.qty.set !== undefined) {
        if (updateData.qty.set < 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Quantity cannot be negative",
            },
            { status: 400 }
          );
        }
        updateData.qty = updateData.qty.set;
      }
    }

    // Validate stock code if being updated
    if (updateData.code && !isValidStockCode(updateData.code)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid stock code format",
        },
        { status: 400 }
      );
    }

    // Handle isActive conversion
    if (updateData.isActive !== undefined) {
      updateData.isActive = Boolean(updateData.isActive);
    }

    // Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.category) updateData.category = updateData.category.trim();
    if (updateData.description)
      updateData.description = updateData.description.trim();
    if (updateData.code) updateData.code = updateData.code.toUpperCase().trim();

    // Check for duplicate stock code if being updated
    if (updateData.code) {
      const duplicateCode = await StockItem.findOne({
        code: updateData.code,
        _id: { $ne: id },
      });

      if (duplicateCode) {
        return NextResponse.json(
          {
            success: false,
            error: "Stock code already exists",
          },
          { status: 409 }
        );
      }
    }

    // Update stock item with only provided fields
    const updatedItem = await StockItem.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate({
        path: "supplier",
        model: Supplier,
        select: "supplierCode name",
      })
      .lean();

    // Format response
    const stockItemResponse = formatStockItemResponse(updatedItem);

    return NextResponse.json({
      success: true,
      message: "Stock item updated successfully",
      data: stockItemResponse,
    });
  } catch (error: any) {
    console.error("Error patching stock item:", error);

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
        error: "Failed to update stock item",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Special endpoint for bulk updates (like stock count adjustments)
export async function PATCH_BULK(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Updates array is required",
        },
        { status: 400 }
      );
    }

    // Validate all updates
    const operations = [];
    const stockItems = [];

    for (const update of updates) {
      if (!update.id || update.qty === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: "Each update must include id and qty",
          },
          { status: 400 }
        );
      }

      if (!Types.ObjectId.isValid(update.id)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid stock item ID: ${update.id}`,
          },
          { status: 400 }
        );
      }

      if (typeof update.qty !== "number") {
        return NextResponse.json(
          {
            success: false,
            error: "Quantity must be a number",
          },
          { status: 400 }
        );
      }

      // Check if stock item exists
      const existingItem = await StockItem.findById(update.id);
      if (!existingItem) {
        return NextResponse.json(
          {
            success: false,
            error: `Stock item not found: ${update.id}`,
          },
          { status: 404 }
        );
      }

      const newQty = update.qty;
      if (newQty < 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Quantity cannot be negative for item: ${existingItem.code}`,
          },
          { status: 400 }
        );
      }

      operations.push({
        updateOne: {
          filter: { _id: update.id },
          update: { $set: { qty: newQty } },
        },
      });

      stockItems.push({
        id: update.id,
        code: existingItem.code,
        oldQty: existingItem.qty,
        newQty,
      });
    }

    // Execute bulk update
    if (operations.length > 0) {
      await StockItem.bulkWrite(operations);
    }

    return NextResponse.json({
      success: true,
      message: "Bulk update completed successfully",
      data: {
        updatedCount: operations.length,
        items: stockItems,
      },
    });
  } catch (error: any) {
    console.error("Error in bulk update:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to perform bulk update",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
