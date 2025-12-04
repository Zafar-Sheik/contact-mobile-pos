// app/api/fuel/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Fuel, { IFuel } from "@/lib/models/Fuel";
import { Types } from "mongoose";

// Helper function to validate fuel data
function validateFuelData(body: any) {
  const errors: string[] = [];

  // Check required fields
  const requiredFields = [
    "vehicle",
    "currentMileage",
    "kmUsedSinceLastFill",
    "litresFilled",
    "randValue",
    "garageName",
  ];

  requiredFields.forEach((field) => {
    if (!body[field] && body[field] !== 0) {
      errors.push(`${field} is required`);
    }
  });

  // Validate numeric fields
  if (body.currentMileage !== undefined) {
    if (typeof body.currentMileage !== "number" || body.currentMileage < 0) {
      errors.push("Current mileage must be a positive number");
    }
  }

  if (body.kmUsedSinceLastFill !== undefined) {
    if (
      typeof body.kmUsedSinceLastFill !== "number" ||
      body.kmUsedSinceLastFill < 0
    ) {
      errors.push("Kilometers used must be a positive number");
    }
  }

  if (body.litresFilled !== undefined) {
    if (
      typeof body.litresFilled !== "number" ||
      body.litresFilled <= 0 ||
      body.litresFilled > 1000
    ) {
      errors.push("Litres filled must be between 0.01 and 1000");
    }
  }

  if (body.randValue !== undefined) {
    if (typeof body.randValue !== "number" || body.randValue <= 0) {
      errors.push("Rand value must be greater than 0");
    }
  }

  // Validate date if provided
  if (body.date) {
    const date = new Date(body.date);
    if (isNaN(date.getTime())) {
      errors.push("Invalid date format");
    }
  }

  return errors;
}

// Helper function to format fuel response
function formatFuelResponse(fuel: any) {
  const costPerLitre =
    fuel.litresFilled > 0 ? fuel.randValue / fuel.litresFilled : 0;
  const kmPerLitre =
    fuel.litresFilled > 0 ? fuel.kmUsedSinceLastFill / fuel.litresFilled : 0;
  const costPerKm =
    fuel.kmUsedSinceLastFill > 0
      ? fuel.randValue / fuel.kmUsedSinceLastFill
      : 0;

  return {
    ...fuel,
    _id: fuel._id.toString(),
    costPerLitre,
    kmPerLitre,
    costPerKm,
    formattedDate: new Date(fuel.date).toLocaleDateString("en-ZA", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    formattedRandValue: fuel.randValue.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    formattedCostPerLitre: costPerLitre.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }),
    formattedKmPerLitre: kmPerLitre.toFixed(2),
    formattedCostPerKm: costPerKm.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }),
  };
}

// Helper function to calculate fuel efficiency metrics
async function calculateFuelMetrics(query: any = {}) {
  const metrics = await Fuel.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$vehicle",
        totalFuelCost: { $sum: "$randValue" },
        totalLitres: { $sum: "$litresFilled" },
        totalKm: { $sum: "$kmUsedSinceLastFill" },
        avgCostPerLitre: { $avg: { $divide: ["$randValue", "$litresFilled"] } },
        avgKmPerLitre: {
          $avg: { $divide: ["$kmUsedSinceLastFill", "$litresFilled"] },
        },
        fillCount: { $sum: 1 },
        firstFill: { $min: "$date" },
        lastFill: { $max: "$date" },
      },
    },
    {
      $project: {
        vehicle: "$_id",
        totalFuelCost: 1,
        totalLitres: 1,
        totalKm: 1,
        avgCostPerLitre: 1,
        avgKmPerLitre: 1,
        fillCount: 1,
        firstFill: 1,
        lastFill: 1,
        avgCostPerKm: { $divide: ["$totalFuelCost", "$totalKm"] },
      },
    },
    { $sort: { vehicle: 1 } },
  ]);

  return metrics.map((metric) => ({
    ...metric,
    formattedTotalFuelCost: metric.totalFuelCost.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    formattedAvgCostPerLitre: metric.avgCostPerLitre.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }),
    formattedAvgCostPerKm: (
      metric.totalFuelCost / metric.totalKm
    ).toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }),
    avgKmPerLitre: metric.avgKmPerLitre.toFixed(2),
  }));
}

// GET - Fetch all fuel records or single record
export async function GET(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const vehicle = searchParams.get("vehicle");

    // If ID is provided, fetch single fuel record
    if (id) {
      return await getSingleFuelRecord(id);
    }

    // Otherwise fetch all fuel records with filters
    return await getAllFuelRecords(request);
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

// Helper function to get all fuel records
async function getAllFuelRecords(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const sortBy = searchParams.get("sortBy") || "date";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const vehicle = searchParams.get("vehicle");
  const garage = searchParams.get("garage");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const includeMetrics = searchParams.get("includeMetrics") === "true";

  const skip = (page - 1) * limit;

  // Build query
  const query: any = {};

  if (search) {
    query.$or = [
      { vehicle: { $regex: search, $options: "i" } },
      { garageName: { $regex: search, $options: "i" } },
    ];
  }

  if (vehicle) {
    query.vehicle = vehicle;
  }

  if (garage) {
    query.garageName = { $regex: garage, $options: "i" };
  }

  // Date range filter
  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = new Date(startDate);
    }
    if (endDate) {
      query.date.$lte = new Date(endDate);
    }
  }

  // Amount range filter
  if (minAmount || maxAmount) {
    query.randValue = {};
    if (minAmount) {
      query.randValue.$gte = parseFloat(minAmount);
    }
    if (maxAmount) {
      query.randValue.$lte = parseFloat(maxAmount);
    }
  }

  // Sorting
  const sort: any = {};
  sort[sortBy] = sortOrder;

  // Execute queries
  const [fuelRecords, totalCount] = await Promise.all([
    Fuel.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Fuel.countDocuments(query),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / limit);

  // Format response data
  const formattedRecords = fuelRecords.map(formatFuelResponse);

  // Calculate summary statistics
  const summary = {
    totalRecords: formattedRecords.length,
    totalFuelCost: formattedRecords.reduce(
      (sum, record) => sum + record.randValue,
      0
    ),
    totalLitres: formattedRecords.reduce(
      (sum, record) => sum + record.litresFilled,
      0
    ),
    totalKm: formattedRecords.reduce(
      (sum, record) => sum + record.kmUsedSinceLastFill,
      0
    ),
    avgCostPerLitre:
      formattedRecords.length > 0
        ? formattedRecords.reduce(
            (sum, record) => sum + record.costPerLitre,
            0
          ) / formattedRecords.length
        : 0,
    avgKmPerLitre:
      formattedRecords.length > 0
        ? formattedRecords.reduce((sum, record) => sum + record.kmPerLitre, 0) /
          formattedRecords.length
        : 0,
    vehicles: Array.from(
      new Set(formattedRecords.map((record) => record.vehicle))
    ),
  };

  // Format summary values
  const formattedSummary = {
    ...summary,
    formattedTotalFuelCost: summary.totalFuelCost.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    formattedAvgCostPerLitre: summary.avgCostPerLitre.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }),
    avgKmPerLitre: summary.avgKmPerLitre.toFixed(2),
    avgCostPerKm:
      summary.totalKm > 0 ? summary.totalFuelCost / summary.totalKm : 0,
    formattedAvgCostPerKm: (summary.totalKm > 0
      ? summary.totalFuelCost / summary.totalKm
      : 0
    ).toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }),
  };

  // Calculate fuel metrics if requested
  let fuelMetrics = null;
  if (includeMetrics) {
    fuelMetrics = await calculateFuelMetrics(query);
  }

  const response: any = {
    success: true,
    data: formattedRecords,
    summary: formattedSummary,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };

  if (fuelMetrics) {
    response.metrics = fuelMetrics;
  }

  return NextResponse.json(response);
}

// Helper function to get single fuel record
async function getSingleFuelRecord(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid fuel record ID format",
      },
      { status: 400 }
    );
  }

  const fuelRecord = await Fuel.findById(id).lean();

  if (!fuelRecord) {
    return NextResponse.json(
      {
        success: false,
        error: "Fuel record not found",
      },
      { status: 404 }
    );
  }

  // Format the fuel record with all details
  const formattedRecord = formatFuelResponse(fuelRecord);

  // Get previous and next records for the same vehicle
  const [prevRecord, nextRecord] = await Promise.all([
    Fuel.findOne({
      vehicle: fuelRecord.vehicle,
      date: { $lt: fuelRecord.date },
    })
      .sort({ date: -1 })
      .lean(),
    Fuel.findOne({
      vehicle: fuelRecord.vehicle,
      date: { $gt: fuelRecord.date },
    })
      .sort({ date: 1 })
      .lean(),
  ]);

  const response: any = {
    success: true,
    data: formattedRecord,
  };

  if (prevRecord) {
    response.previousRecord = formatFuelResponse(prevRecord);
  }

  if (nextRecord) {
    response.nextRecord = formatFuelResponse(nextRecord);
  }

  return NextResponse.json(response);
}

// POST - Create a new fuel record
export async function POST(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();

    // Validate fuel data
    const validationErrors = validateFuelData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // Prepare fuel data
    const fuelData = {
      date: body.date ? new Date(body.date) : new Date(),
      vehicle: body.vehicle.trim(),
      currentMileage: parseFloat(body.currentMileage),
      kmUsedSinceLastFill: parseFloat(body.kmUsedSinceLastFill),
      litresFilled: parseFloat(body.litresFilled),
      randValue: parseFloat(body.randValue),
      garageName: body.garageName.trim(),
    };

    // Validate that kmUsedSinceLastFill is reasonable
    const maxKmPerLitre = 20; // Reasonable maximum km per litre
    const kmPerLitre =
      fuelData.litresFilled > 0
        ? fuelData.kmUsedSinceLastFill / fuelData.litresFilled
        : 0;

    if (kmPerLitre > maxKmPerLitre) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fuel efficiency seems unrealistic. Please check kilometers used and litres filled.",
          details: [
            `Calculated ${kmPerLitre.toFixed(
              2
            )} km/l exceeds maximum reasonable value of ${maxKmPerLitre} km/l`,
          ],
        },
        { status: 400 }
      );
    }

    // Check for duplicate entries (same vehicle, similar date)
    const existingRecord = await Fuel.findOne({
      vehicle: fuelData.vehicle,
      date: {
        $gte: new Date(fuelData.date.getTime() - 24 * 60 * 60 * 1000),
        $lte: new Date(fuelData.date.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (existingRecord) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fuel record for this vehicle already exists for this date range",
          existingRecord: formatFuelResponse(existingRecord),
        },
        { status: 409 }
      );
    }

    // Create new fuel record
    const fuelRecord = await Fuel.create(fuelData);

    // Format response
    const formattedRecord = formatFuelResponse(fuelRecord.toObject());

    return NextResponse.json(
      {
        success: true,
        message: "Fuel record created successfully",
        data: formattedRecord,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating fuel record:", error);

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
        error: "Failed to create fuel record",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Update an existing fuel record
export async function PUT(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Fuel record ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid fuel record ID format",
        },
        { status: 400 }
      );
    }

    // Check if fuel record exists
    const existingRecord = await Fuel.findById(id);
    if (!existingRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "Fuel record not found",
        },
        { status: 404 }
      );
    }

    // Validate update data
    const validationErrors = validateFuelData(updateData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateObject: any = {};

    // Handle date update
    if (updateData.date !== undefined) {
      updateObject.date = new Date(updateData.date);
    }

    // Handle string fields
    if (updateData.vehicle !== undefined) {
      updateObject.vehicle = updateData.vehicle.trim();
    }

    if (updateData.garageName !== undefined) {
      updateObject.garageName = updateData.garageName.trim();
    }

    // Handle numeric fields
    if (updateData.currentMileage !== undefined) {
      updateObject.currentMileage = parseFloat(updateData.currentMileage);
    }

    if (updateData.kmUsedSinceLastFill !== undefined) {
      updateObject.kmUsedSinceLastFill = parseFloat(
        updateData.kmUsedSinceLastFill
      );
    }

    if (updateData.litresFilled !== undefined) {
      updateObject.litresFilled = parseFloat(updateData.litresFilled);
    }

    if (updateData.randValue !== undefined) {
      updateObject.randValue = parseFloat(updateData.randValue);
    }

    // Validate fuel efficiency
    const litres = updateObject.litresFilled || existingRecord.litresFilled;
    const kmUsed =
      updateObject.kmUsedSinceLastFill || existingRecord.kmUsedSinceLastFill;
    const kmPerLitre = litres > 0 ? kmUsed / litres : 0;

    if (kmPerLitre > 20) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fuel efficiency seems unrealistic. Please check kilometers used and litres filled.",
          details: [
            `Calculated ${kmPerLitre.toFixed(
              2
            )} km/l exceeds maximum reasonable value of 20 km/l`,
          ],
        },
        { status: 400 }
      );
    }

    // Check for duplicate entries (same vehicle, similar date) when updating
    if (updateObject.date || updateObject.vehicle) {
      const dateToCheck = updateObject.date || existingRecord.date;
      const vehicleToCheck = updateObject.vehicle || existingRecord.vehicle;

      const duplicateRecord = await Fuel.findOne({
        _id: { $ne: id },
        vehicle: vehicleToCheck,
        date: {
          $gte: new Date(dateToCheck.getTime() - 24 * 60 * 60 * 1000),
          $lte: new Date(dateToCheck.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      if (duplicateRecord) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Another fuel record for this vehicle already exists for this date range",
            duplicateRecord: formatFuelResponse(duplicateRecord),
          },
          { status: 409 }
        );
      }
    }

    // Update fuel record
    const updatedRecord = await Fuel.findByIdAndUpdate(
      id,
      { $set: updateObject },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const formattedRecord = formatFuelResponse(updatedRecord);

    return NextResponse.json({
      success: true,
      message: "Fuel record updated successfully",
      data: formattedRecord,
    });
  } catch (error: any) {
    console.error("Error updating fuel record:", error);

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
        error: "Failed to update fuel record",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a fuel record
export async function DELETE(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Fuel record ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid fuel record ID format",
        },
        { status: 400 }
      );
    }

    // Check if fuel record exists
    const existingRecord = await Fuel.findById(id);
    if (!existingRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "Fuel record not found",
        },
        { status: 404 }
      );
    }

    // Delete fuel record
    await Fuel.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Fuel record deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting fuel record:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete fuel record",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH - Partial update (quick updates)
export async function PATCH(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Fuel record ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid fuel record ID format",
        },
        { status: 400 }
      );
    }

    // Check if fuel record exists
    const existingRecord = await Fuel.findById(id);
    if (!existingRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "Fuel record not found",
        },
        { status: 404 }
      );
    }

    // Only allow specific fields to be updated via PATCH
    const allowedUpdates = ["vehicle", "garageName", "currentMileage", "notes"];
    const invalidUpdates = Object.keys(updateData).filter(
      (key) => !allowedUpdates.includes(key)
    );

    if (invalidUpdates.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only vehicle, garageName, currentMileage, and notes can be updated via PATCH",
          invalidFields: invalidUpdates,
        },
        { status: 400 }
      );
    }

    // Prepare update object
    const updateObject: any = {};

    // Handle string fields
    if (updateData.vehicle !== undefined) {
      updateObject.vehicle = updateData.vehicle.trim();
    }

    if (updateData.garageName !== undefined) {
      updateObject.garageName = updateData.garageName.trim();
    }

    // Handle numeric field
    if (updateData.currentMileage !== undefined) {
      const newMileage = parseFloat(updateData.currentMileage);
      if (newMileage < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Current mileage cannot be negative",
          },
          { status: 400 }
        );
      }
      updateObject.currentMileage = newMileage;
    }

    // Update fuel record
    const updatedRecord = await Fuel.findByIdAndUpdate(
      id,
      { $set: updateObject },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const formattedRecord = formatFuelResponse(updatedRecord);

    return NextResponse.json({
      success: true,
      message: "Fuel record updated successfully",
      data: formattedRecord,
    });
  } catch (error: any) {
    console.error("Error patching fuel record:", error);

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
        error: "Failed to update fuel record",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Special endpoint for bulk import
export async function POST_BULK(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Records array is required",
        },
        { status: 400 }
      );
    }

    // Validate all records
    const validatedRecords = [];
    const validationErrors: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const errors = validateFuelData(record);

      if (errors.length > 0) {
        validationErrors.push({
          index: i,
          errors,
          record,
        });
      } else {
        validatedRecords.push({
          date: record.date ? new Date(record.date) : new Date(),
          vehicle: record.vehicle.trim(),
          currentMileage: parseFloat(record.currentMileage),
          kmUsedSinceLastFill: parseFloat(record.kmUsedSinceLastFill),
          litresFilled: parseFloat(record.litresFilled),
          randValue: parseFloat(record.randValue),
          garageName: record.garageName.trim(),
        });
      }
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed for some records",
          validationErrors,
          validRecords: validatedRecords.length,
          invalidRecords: validationErrors.length,
        },
        { status: 400 }
      );
    }

    // Insert all records
    const insertedRecords = await Fuel.insertMany(validatedRecords);

    // Format response
    const formattedRecords = insertedRecords.map((record) =>
      formatFuelResponse(record.toObject())
    );

    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported ${formattedRecords.length} fuel records`,
        data: formattedRecords,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in bulk import:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to import fuel records",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Special endpoint for fuel analytics and reports
export async function GET_ANALYTICS(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const vehicle = searchParams.get("vehicle");
    const period = searchParams.get("period") || "monthly"; // daily, weekly, monthly, yearly

    // Build query
    const query: any = {};

    if (vehicle) {
      query.vehicle = vehicle;
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

    // Get analytics data
    const analytics = {
      summary: await getFuelSummary(query),
      trends: await getFuelTrends(query, period),
      vehicleComparison: await getVehicleComparison(query),
      garageAnalysis: await getGarageAnalysis(query),
      efficiencyStats: await getEfficiencyStats(query),
    };

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error("Error getting fuel analytics:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get fuel analytics",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function for fuel summary
async function getFuelSummary(query: any) {
  const summary = await Fuel.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        totalFuelCost: { $sum: "$randValue" },
        totalLitres: { $sum: "$litresFilled" },
        totalKm: { $sum: "$kmUsedSinceLastFill" },
        avgCostPerLitre: { $avg: { $divide: ["$randValue", "$litresFilled"] } },
        avgKmPerLitre: {
          $avg: { $divide: ["$kmUsedSinceLastFill", "$litresFilled"] },
        },
        firstRecord: { $min: "$date" },
        lastRecord: { $max: "$date" },
      },
    },
  ]);

  const result = summary[0] || {
    totalRecords: 0,
    totalFuelCost: 0,
    totalLitres: 0,
    totalKm: 0,
    avgCostPerLitre: 0,
    avgKmPerLitre: 0,
  };

  return {
    ...result,
    avgCostPerKm:
      result.totalKm > 0 ? result.totalFuelCost / result.totalKm : 0,
  };
}

// Helper function for fuel trends
async function getFuelTrends(query: any, period: string) {
  let dateFormat = "%Y-%m";
  let interval = "month";

  switch (period) {
    case "daily":
      dateFormat = "%Y-%m-%d";
      interval = "day";
      break;
    case "weekly":
      dateFormat = "%Y-%U";
      interval = "week";
      break;
    case "yearly":
      dateFormat = "%Y";
      interval = "year";
      break;
  }

  const trends = await Fuel.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          $dateToString: { format: dateFormat, date: "$date" },
        },
        date: { $first: "$date" },
        totalFuelCost: { $sum: "$randValue" },
        totalLitres: { $sum: "$litresFilled" },
        totalKm: { $sum: "$kmUsedSinceLastFill" },
        recordCount: { $sum: 1 },
      },
    },
    { $sort: { date: 1 } },
  ]);

  return trends.map((trend) => ({
    period: trend._id,
    date: trend.date,
    totalFuelCost: trend.totalFuelCost,
    totalLitres: trend.totalLitres,
    totalKm: trend.totalKm,
    recordCount: trend.recordCount,
    avgCostPerLitre:
      trend.totalLitres > 0 ? trend.totalFuelCost / trend.totalLitres : 0,
    avgKmPerLitre:
      trend.totalLitres > 0 ? trend.totalKm / trend.totalLitres : 0,
    interval,
  }));
}

// Helper function for vehicle comparison
async function getVehicleComparison(query: any) {
  const comparison = await Fuel.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$vehicle",
        totalFuelCost: { $sum: "$randValue" },
        totalLitres: { $sum: "$litresFilled" },
        totalKm: { $sum: "$kmUsedSinceLastFill" },
        recordCount: { $sum: 1 },
        avgCostPerLitre: { $avg: { $divide: ["$randValue", "$litresFilled"] } },
        avgKmPerLitre: {
          $avg: { $divide: ["$kmUsedSinceLastFill", "$litresFilled"] },
        },
      },
    },
    { $sort: { totalFuelCost: -1 } },
  ]);

  return comparison.map((vehicle) => ({
    vehicle: vehicle._id,
    totalFuelCost: vehicle.totalFuelCost,
    totalLitres: vehicle.totalLitres,
    totalKm: vehicle.totalKm,
    recordCount: vehicle.recordCount,
    avgCostPerLitre: vehicle.avgCostPerLitre,
    avgKmPerLitre: vehicle.avgKmPerLitre,
    avgCostPerKm:
      vehicle.totalKm > 0 ? vehicle.totalFuelCost / vehicle.totalKm : 0,
  }));
}

// Helper function for garage analysis
async function getGarageAnalysis(query: any) {
  const analysis = await Fuel.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$garageName",
        totalFuelCost: { $sum: "$randValue" },
        totalLitres: { $sum: "$litresFilled" },
        recordCount: { $sum: 1 },
        avgCostPerLitre: { $avg: { $divide: ["$randValue", "$litresFilled"] } },
      },
    },
    { $sort: { totalFuelCost: -1 } },
  ]);

  return analysis.map((garage) => ({
    garage: garage._id,
    totalFuelCost: garage.totalFuelCost,
    totalLitres: garage.totalLitres,
    recordCount: garage.recordCount,
    avgCostPerLitre: garage.avgCostPerLitre,
  }));
}

// Helper function for efficiency stats
async function getEfficiencyStats(query: any) {
  const stats = await Fuel.aggregate([
    { $match: query },
    {
      $project: {
        vehicle: 1,
        kmPerLitre: { $divide: ["$kmUsedSinceLastFill", "$litresFilled"] },
        costPerLitre: { $divide: ["$randValue", "$litresFilled"] },
        costPerKm: {
          $divide: [
            "$randValue",
            {
              $cond: [
                { $eq: ["$kmUsedSinceLastFill", 0] },
                1,
                "$kmUsedSinceLastFill",
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        bestKmPerLitre: { $max: "$kmPerLitre" },
        worstKmPerLitre: { $min: "$kmPerLitre" },
        avgKmPerLitre: { $avg: "$kmPerLitre" },
        bestCostPerKm: { $min: "$costPerKm" },
        worstCostPerKm: { $max: "$costPerKm" },
        avgCostPerKm: { $avg: "$costPerKm" },
      },
    },
  ]);

  return (
    stats[0] || {
      bestKmPerLitre: 0,
      worstKmPerLitre: 0,
      avgKmPerLitre: 0,
      bestCostPerKm: 0,
      worstCostPerKm: 0,
      avgCostPerKm: 0,
    }
  );
}
