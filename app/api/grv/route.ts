// app/api/grv/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import GRV from "@/lib/models/GRV";
import StockItem from "@/lib/models/StockItem";
import Supplier from "@/lib/models/Supplier";
import connectDB from "@/lib/db";

// Helper function to handle errors
const handleError = (error: any, message: string) => {
  console.error(`${message}:`, error);

  if (error instanceof mongoose.Error.ValidationError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  if (error.code === 11000) {
    return NextResponse.json(
      { success: false, error: "GRVReference must be unique" },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: false, error: message }, { status: 500 });
};

// Helper to validate GRV data
const validateGRVData = (data: any) => {
  const errors: string[] = [];

  if (!data.supplier) {
    errors.push("Supplier is required");
  }

  if (!data.date) {
    errors.push("Date is required");
  }

  if (
    !data.itemsReceived ||
    !Array.isArray(data.itemsReceived) ||
    data.itemsReceived.length === 0
  ) {
    errors.push("At least one item is required");
  } else {
    data.itemsReceived.forEach((item: any, index: number) => {
      if (!item.stockItem) {
        errors.push(`Item ${index + 1}: Stock item is required`);
      }
      if (!item.qty || item.qty < 1) {
        errors.push(`Item ${index + 1}: Valid quantity is required`);
      }
      if (!item.costPrice || item.costPrice < 0) {
        errors.push(`Item ${index + 1}: Valid cost price is required`);
      }
      if (!item.sellPrice || item.sellPrice < 0) {
        errors.push(`Item ${index + 1}: Valid sell price is required`);
      }
    });
  }

  return errors;
};

// GET all GRVs with pagination, filtering, and sorting
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const supplierId = searchParams.get("supplier");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const searchTerm = searchParams.get("search");

    // Build query
    const query: any = {};

    if (supplierId) {
      query.supplier = supplierId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    if (searchTerm) {
      query.$or = [
        { GRVReference: { $regex: searchTerm, $options: "i" } },
        { orderNumber: { $regex: searchTerm, $options: "i" } },
        { notes: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query with population
    const [grvs, total] = await Promise.all([
      GRV.find(query)
        .populate("supplier", "name supplierCode")
        .populate("itemsReceived.stockItem", "code name category")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      GRV.countDocuments(query),
    ]);

    // Calculate totals summary
    const summary = await GRV.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalQuantity: { $sum: "$totalQty" },
          totalCost: { $sum: "$totalCost" },
          totalValue: { $sum: "$totalValue" },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: grvs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: summary[0] || {
        totalDocuments: 0,
        totalQuantity: 0,
        totalCost: 0,
        totalValue: 0,
      },
    });
  } catch (error) {
    return handleError(error, "Failed to fetch GRVs");
  }
}

// POST - Create a new GRV
export async function POST(request: NextRequest) {
  let session = null;

  try {
    await connectDB();

    const body = await request.json();

    // Validate required data - Remove GRVReference validation
    const validationErrors = validateGRVData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, errors: validationErrors },
        { status: 400 }
      );
    }

    // Start a transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Validate all stock items exist
    const stockItemIds = body.itemsReceived.map((item: any) => item.stockItem);
    const stockItems = await StockItem.find({
      _id: { $in: stockItemIds },
    }).session(session);

    if (stockItems.length !== stockItemIds.length) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: "One or more stock items not found" },
        { status: 404 }
      );
    }

    // Validate supplier exists
    const supplier = await Supplier.findById(body.supplier).session(session);
    if (!supplier) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Generate GRV reference (ALWAYS generate it, don't accept from frontend)
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

    const lastGRV = await GRV.findOne(
      { GRVReference: { $regex: `^GRV${year}${month}` } },
      {},
      { sort: { GRVReference: -1 }, session }
    );

    let sequence = 1;
    if (lastGRV) {
      const lastSeq = parseInt(lastGRV.GRVReference.slice(-3));
      sequence = lastSeq + 1;
    }

    const grvReference = `GRV${year}${month}${sequence
      .toString()
      .padStart(3, "0")}`;

    // Calculate totals
    const itemsReceived = body.itemsReceived.map((item: any) => ({
      stockItem: new mongoose.Types.ObjectId(item.stockItem),
      qty: Number(item.qty),
      costPrice: Number(item.costPrice),
      sellPrice: Number(item.sellPrice),
    }));

    const totalQty = itemsReceived.reduce(
      (sum: number, item: any) => sum + item.qty,
      0
    );
    const totalCost = itemsReceived.reduce(
      (sum: number, item: any) => sum + item.qty * item.costPrice,
      0
    );
    const totalValue = itemsReceived.reduce(
      (sum: number, item: any) => sum + item.qty * item.sellPrice,
      0
    );

    // Create GRV data
    const grvData = {
      GRVReference: grvReference,
      supplier: new mongoose.Types.ObjectId(body.supplier),
      date: new Date(body.date),
      orderNumber: body.orderNumber || "",
      notes: body.notes || "",
      itemsReceived,
      totalQty,
      totalCost,
      totalValue,
    };

    // Create GRV
    const grv = new GRV(grvData);
    await grv.save({ session });

    // Update stock quantities
    for (const item of itemsReceived) {
      await StockItem.findByIdAndUpdate(
        item.stockItem,
        {
          $inc: { qty: item.qty },
          $set: {
            "price.cost": item.costPrice,
            "price.sellingC": item.sellPrice,
          },
        },
        { session }
      );
    }

    // Commit transaction
    await session.commitTransaction();

    // Populate and return the created GRV
    const populatedGRV = await GRV.findById(grv._id)
      .populate("supplier", "name supplierCode")
      .populate("itemsReceived.stockItem", "code name category")
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: populatedGRV,
        message: "GRV created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    // Abort transaction on error
    if (session) {
      await session.abortTransaction();
    }
    return handleError(error, "Failed to create GRV");
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

// PUT - Update a GRV
export async function PUT(request: NextRequest) {
  let session = null;

  try {
    await connectDB();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "GRV ID is required" },
        { status: 400 }
      );
    }

    // Validate required data if items are being updated
    if (updateData.itemsReceived) {
      const validationErrors = validateGRVData(updateData);
      if (validationErrors.length > 0) {
        return NextResponse.json(
          { success: false, errors: validationErrors },
          { status: 400 }
        );
      }
    }

    // Start a transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Find existing GRV
    const existingGRV = await GRV.findById(id).session(session);
    if (!existingGRV) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: "GRV not found" },
        { status: 404 }
      );
    }

    // Initialize update object
    const updateObject: any = {};

    // If items are being updated, handle stock updates
    if (updateData.itemsReceived) {
      // Revert old stock quantities
      for (const oldItem of existingGRV.itemsReceived) {
        await StockItem.findByIdAndUpdate(
          oldItem.stockItem,
          {
            $inc: { qty: -oldItem.qty },
          },
          { session }
        );
      }

      // Validate new stock items exist
      const stockItemIds = updateData.itemsReceived.map(
        (item: any) => item.stockItem
      );
      const stockItems = await StockItem.find({
        _id: { $in: stockItemIds },
      }).session(session);

      if (stockItems.length !== stockItemIds.length) {
        await session.abortTransaction();
        return NextResponse.json(
          { success: false, error: "One or more stock items not found" },
          { status: 404 }
        );
      }

      // Format new items
      const itemsReceived = updateData.itemsReceived.map((item: any) => ({
        stockItem: new mongoose.Types.ObjectId(item.stockItem),
        qty: Number(item.qty),
        costPrice: Number(item.costPrice),
        sellPrice: Number(item.sellPrice),
      }));

      // Calculate new totals
      const totalQty = itemsReceived.reduce(
        (sum: number, item: any) => sum + item.qty,
        0
      );
      const totalCost = itemsReceived.reduce(
        (sum: number, item: any) => sum + item.qty * item.costPrice,
        0
      );
      const totalValue = itemsReceived.reduce(
        (sum: number, item: any) => sum + item.qty * item.sellPrice,
        0
      );

      updateObject.itemsReceived = itemsReceived;
      updateObject.totalQty = totalQty;
      updateObject.totalCost = totalCost;
      updateObject.totalValue = totalValue;

      // Update stock with new quantities and prices
      for (const newItem of itemsReceived) {
        await StockItem.findByIdAndUpdate(
          newItem.stockItem,
          {
            $inc: { qty: newItem.qty },
            $set: {
              "price.cost": newItem.costPrice,
              "price.sellingC": newItem.sellPrice,
            },
          },
          { session }
        );
      }
    }

    // Handle other fields
    if (updateData.supplier) {
      // Validate supplier exists
      const supplier = await Supplier.findById(updateData.supplier).session(
        session
      );
      if (!supplier) {
        await session.abortTransaction();
        return NextResponse.json(
          { success: false, error: "Supplier not found" },
          { status: 404 }
        );
      }
      updateObject.supplier = new mongoose.Types.ObjectId(updateData.supplier);
    }

    if (updateData.date) {
      updateObject.date = new Date(updateData.date);
    }

    if (updateData.orderNumber !== undefined) {
      updateObject.orderNumber = updateData.orderNumber;
    }

    if (updateData.notes !== undefined) {
      updateObject.notes = updateData.notes;
    }

    // Update GRV
    const updatedGRV = await GRV.findByIdAndUpdate(id, updateObject, {
      new: true,
      runValidators: true,
      session,
    });

    // Commit transaction
    await session.commitTransaction();

    // Populate and return the updated GRV
    const populatedGRV = await GRV.findById(updatedGRV._id)
      .populate("supplier", "name supplierCode")
      .populate("itemsReceived.stockItem", "code name category")
      .lean();

    return NextResponse.json({
      success: true,
      data: populatedGRV,
      message: "GRV updated successfully",
    });
  } catch (error) {
    // Abort transaction on error
    if (session) {
      await session.abortTransaction();
    }
    return handleError(error, "Failed to update GRV");
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

// DELETE - Delete a GRV
export async function DELETE(request: NextRequest) {
  let session = null;

  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "GRV ID is required" },
        { status: 400 }
      );
    }

    // Start a transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Find GRV
    const grv = await GRV.findById(id)
      .populate("itemsReceived.stockItem")
      .session(session);
    if (!grv) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: "GRV not found" },
        { status: 404 }
      );
    }

    // Revert stock quantities
    for (const item of grv.itemsReceived) {
      await StockItem.findByIdAndUpdate(
        item.stockItem,
        {
          $inc: { qty: -item.qty },
        },
        { session }
      );
    }

    // Delete GRV
    await GRV.findByIdAndDelete(id).session(session);

    // Commit transaction
    await session.commitTransaction();

    return NextResponse.json({
      success: true,
      message: "GRV deleted successfully",
    });
  } catch (error) {
    // Abort transaction on error
    if (session) {
      await session.abortTransaction();
    }
    return handleError(error, "Failed to delete GRV");
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

// PATCH - Partially update a GRV (for specific fields like notes, orderNumber)
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "GRV ID is required" },
        { status: 400 }
      );
    }

    // Only allow updates to specific fields in PATCH
    const allowedFields = ["notes", "orderNumber", "pdf"];
    const filteredUpdate: any = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdate[key] = updateData[key];
      }
    });

    // Format date if provided (special handling)
    if (updateData.date) {
      filteredUpdate.date = new Date(updateData.date);
    }

    // Update GRV
    const updatedGRV = await GRV.findByIdAndUpdate(id, filteredUpdate, {
      new: true,
      runValidators: true,
    });

    if (!updatedGRV) {
      return NextResponse.json(
        { success: false, error: "GRV not found" },
        { status: 404 }
      );
    }

    // Populate and return the updated GRV
    const populatedGRV = await GRV.findById(updatedGRV._id)
      .populate("supplier", "name supplierCode")
      .populate("itemsReceived.stockItem", "code name category")
      .lean();

    return NextResponse.json({
      success: true,
      data: populatedGRV,
      message: "GRV updated successfully",
    });
  } catch (error) {
    return handleError(error, "Failed to update GRV");
  }
}
