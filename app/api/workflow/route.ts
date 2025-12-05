// app/api/workflow/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Workflow from "@/lib/models/Workflow";
import Client from "@/lib/models/Client";
import StockItem from "@/lib/models/StockItem";

// GET handler
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const clientFilter = searchParams.get("client") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    // Build query
    const query: Record<string, any> = {};

    if (search) {
      query.$or = [
        { location: { $regex: search, $options: "i" } },
        { "client.companyName": { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (clientFilter) {
      query.client = clientFilter;
    }

    // Fetch workflows with populated client and stock items
    const workflows = await Workflow.find(query)
      .populate({
        path: "client",
        model: Client,
        select: "customerCode companyName owner email cellNo",
      })
      .populate({
        path: "stockItems.stockItem",
        model: StockItem,
        select: "code name price",
      })
      .sort({ date: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await Workflow.countDocuments(query);

    // Format response
    const formattedWorkflows = workflows.map((workflow) => ({
      ...workflow.toObject(),
      formattedEstCost: (workflow.estCost || 0).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      totalItems: workflow.stockItems.reduce(
        (sum: number, item: any) => sum + (item.qty || 0),
        0
      ),
    }));

    return NextResponse.json(
      {
        success: true,
        data: formattedWorkflows,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Workflow GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch workflows",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { date, client, location, estCost, status, stockItems } = body;

    // Validate required fields
    if (!date || !client || !location || estCost === undefined || !status) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields",
          details: [
            !date && "Date is required",
            !client && "Client is required",
            !location && "Location is required",
            estCost === undefined && "Estimated cost is required",
            !status && "Status is required",
          ].filter(Boolean),
        },
        { status: 400 }
      );
    }

    // Validate stock items
    if (!Array.isArray(stockItems) || stockItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one stock item is required",
        },
        { status: 400 }
      );
    }

    // Create workflow
    const workflow = await Workflow.create({
      date: new Date(date),
      client,
      location,
      estCost: parseFloat(estCost),
      status,
      stockItems: stockItems.map((item: any) => ({
        stockItem: item.stockItem._id || item.stockItem,
        qty: parseInt(item.qty, 10),
      })),
    });

    // Populate references
    await workflow.populate([
      {
        path: "client",
        model: Client,
        select: "customerCode companyName owner email cellNo",
      },
      {
        path: "stockItems.stockItem",
        model: StockItem,
        select: "code name price",
      },
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Workflow created successfully",
        data: workflow,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Workflow POST error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create workflow",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT handler
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { id, date, client, location, estCost, status, stockItems } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Workflow ID is required",
        },
        { status: 400 }
      );
    }

    const workflow = await Workflow.findByIdAndUpdate(
      id,
      {
        date: date ? new Date(date) : undefined,
        client,
        location,
        estCost: estCost ? parseFloat(estCost) : undefined,
        status,
        stockItems: stockItems
          ? stockItems.map((item: any) => ({
              stockItem: item.stockItem._id || item.stockItem,
              qty: parseInt(item.qty, 10),
            }))
          : undefined,
      },
      { new: true }
    ).populate([
      {
        path: "client",
        model: Client,
        select: "customerCode companyName owner email cellNo",
      },
      {
        path: "stockItems.stockItem",
        model: StockItem,
        select: "code name price",
      },
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Workflow updated successfully",
        data: workflow,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Workflow PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update workflow",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE handler
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Workflow ID is required",
        },
        { status: 400 }
      );
    }

    await Workflow.findByIdAndDelete(id);

    return NextResponse.json(
      {
        success: true,
        message: "Workflow deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Workflow DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete workflow",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
