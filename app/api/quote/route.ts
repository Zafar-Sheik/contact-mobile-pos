// app/api/quote/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Quote, { IQuote } from "@/lib/models/Quote";
import StockItem from "@/lib/models/StockItem";
import Client from "@/lib/models/Client";
import { Types } from "mongoose";

// Helper function to validate quote data
function validateQuoteData(body: any) {
  const errors: string[] = [];

  // Check required fields
  if (!body.client) errors.push("Client is required");
  if (!Array.isArray(body.quoteItems) || body.quoteItems.length === 0) {
    errors.push("At least one quote item is required");
  }

  // Validate items
  if (Array.isArray(body.quoteItems)) {
    body.quoteItems.forEach((item: any, index: number) => {
      if (!item.stockItem)
        errors.push(`Item ${index + 1}: Stock item is required`);
      if (!item.qty || item.qty <= 0)
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      if (!item.price || item.price < 0)
        errors.push(`Item ${index + 1}: Price cannot be negative`);
      if (item.VATRate === undefined) {
        errors.push(`Item ${index + 1}: VAT rate is required`);
      }
      if (
        item.VATRate !== undefined &&
        (item.VATRate < 0 || item.VATRate > 100)
      ) {
        errors.push(`Item ${index + 1}: VAT rate must be between 0-100%`);
      }
    });
  }

  return errors;
}

// Helper function to format quote response
async function formatQuoteResponse(quote: any) {
  const populated = await Quote.findById(quote._id)
    .populate(
      "client",
      "customerCode companyName owner address cellNo email priceCategory"
    )
    .populate("quoteItems.stockItem", "code name category price priceCategory")
    .lean();

  if (!populated) return quote;

  // Format items with additional details
  const formattedItems = populated.quoteItems.map((item: any) => {
    const stockItem = item.stockItem;
    const lineTotal = item.qty * item.price;
    const vatAmount = (lineTotal * item.VATRate) / 100;

    return {
      ...item,
      stockItem: {
        ...stockItem,
        _id: stockItem._id.toString(),
        formattedCost: stockItem.price.cost.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
        formattedSellingC: stockItem.price.sellingC.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
      },
      lineTotal,
      vatAmount,
      total: lineTotal + vatAmount,
      formattedPrice: item.price.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      formattedLineTotal: lineTotal.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      formattedVATAmount: vatAmount.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      formattedTotal: (lineTotal + vatAmount).toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
    };
  });

  // Calculate totals
  const totals = {
    subTotal: formattedItems.reduce(
      (sum: number, item: any) => sum + item.lineTotal,
      0
    ),
    vatTotal: formattedItems.reduce(
      (sum: number, item: any) => sum + item.vatAmount,
      0
    ),
    totalDue: formattedItems.reduce(
      (sum: number, item: any) => sum + item.total,
      0
    ),
    totalQty: formattedItems.reduce(
      (sum: number, item: any) => sum + item.qty,
      0
    ),
  };

  return {
    ...populated,
    _id: populated._id.toString(),
    formattedDate: new Date(populated.date).toLocaleDateString("en-ZA"),
    quoteItems: formattedItems,
    ...totals,
    formattedSubTotal: totals.subTotal.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    formattedVATTotal: totals.vatTotal.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    formattedTotalDue: totals.totalDue.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    client: {
      ...populated.client,
      _id: populated.client._id.toString(),
    },
  };
}

// Helper function to get quote status
function getQuoteStatus(quote: any) {
  const quoteDate = new Date(quote.date);
  const currentDate = new Date();
  const daysSinceQuote = Math.floor(
    (currentDate.getTime() - quoteDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Default quote validity period: 30 days
  if (daysSinceQuote > 30) return "Expired";
  if (quote.convertedToInvoice) return "Converted";
  return "Active";
}

// GET - Fetch all quotes or single quote
export async function GET(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const number = searchParams.get("number");

    // If ID or number is provided, fetch single quote
    if (id || number) {
      return await getSingleQuote(id, number);
    }

    // Otherwise fetch all quotes with filters
    return await getAllQuotes(request);
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

// Helper function to get all quotes
async function getAllQuotes(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const sortBy = searchParams.get("sortBy") || "date";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const client = searchParams.get("client");
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");

  const skip = (page - 1) * limit;

  // Build query
  const query: any = {};

  if (search) {
    query.$or = [
      { number: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (client && Types.ObjectId.isValid(client)) {
    query.client = new Types.ObjectId(client);
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

  // Sorting
  const sort: any = {};
  sort[sortBy] = sortOrder;

  // Execute queries with population
  const [quotes, totalCount] = await Promise.all([
    Quote.find(query)
      .populate("client", "customerCode companyName")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Quote.countDocuments(query),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / limit);

  // Format response data with totals and status
  const formattedQuotes = await Promise.all(
    quotes.map(async (quote: any) => {
      const formatted = await formatQuoteResponse(quote);
      const status = getQuoteStatus(quote);

      return {
        ...formatted,
        status,
        daysValid:
          30 -
          Math.floor(
            (Date.now() - new Date(quote.date).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
      };
    })
  );

  // Apply status filter after calculating status
  let filteredQuotes = formattedQuotes;
  if (status) {
    filteredQuotes = formattedQuotes.filter((quote) => quote.status === status);
  }

  // Filter by amount range if specified
  if (minAmount) {
    const min = parseFloat(minAmount);
    filteredQuotes = filteredQuotes.filter((quote) => quote.totalDue >= min);
  }
  if (maxAmount) {
    const max = parseFloat(maxAmount);
    filteredQuotes = filteredQuotes.filter((quote) => quote.totalDue <= max);
  }

  // Calculate summary statistics
  const summary = {
    totalQuotes: filteredQuotes.length,
    totalAmount: filteredQuotes.reduce((sum, quote) => sum + quote.totalDue, 0),
    totalVAT: filteredQuotes.reduce((sum, quote) => sum + quote.vatTotal, 0),
    totalItems: filteredQuotes.reduce((sum, quote) => sum + quote.totalQty, 0),
    activeQuotes: filteredQuotes.filter((quote) => quote.status === "Active")
      .length,
    expiredQuotes: filteredQuotes.filter((quote) => quote.status === "Expired")
      .length,
    convertedQuotes: filteredQuotes.filter(
      (quote) => quote.status === "Converted"
    ).length,
  };

  // Format summary values
  const formattedSummary = {
    ...summary,
    formattedTotalAmount: summary.totalAmount.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    formattedTotalVAT: summary.totalVAT.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
  };

  return NextResponse.json({
    success: true,
    data: filteredQuotes,
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

// Helper function to get single quote
async function getSingleQuote(id: string | null, number: string | null) {
  let query: any = {};

  if (id) {
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid quote ID format",
        },
        { status: 400 }
      );
    }
    query._id = new Types.ObjectId(id);
  } else if (number) {
    query.number = number;
  }

  const quote = await Quote.findOne(query).lean();

  if (!quote) {
    return NextResponse.json(
      {
        success: false,
        error: "Quote not found",
      },
      { status: 404 }
    );
  }

  // Format the quote with full details
  const formattedQuote = await formatQuoteResponse(quote);

  // Get quote status
  const status = getQuoteStatus(quote);

  // Check if converted to invoice
  let invoiceDetails = null;
  if (quote.convertedToInvoice && quote.invoiceReference) {
    const Invoice = (await import("@/lib/models/Invoice")).default;
    const invoice = await Invoice.findById(quote.invoiceReference)
      .populate("client", "companyName")
      .lean();

    if (invoice) {
      invoiceDetails = {
        ...invoice,
        _id: invoice._id.toString(),
        formattedDate: new Date(invoice.date).toLocaleDateString("en-ZA"),
        formattedTotalDue: invoice.totalDue.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
      };
    }
  }

  const quoteWithDetails = {
    ...formattedQuote,
    status,
    daysValid:
      30 -
      Math.floor(
        (Date.now() - new Date(quote.date).getTime()) / (1000 * 60 * 60 * 24)
      ),
    invoiceDetails,
  };

  return NextResponse.json({
    success: true,
    data: quoteWithDetails,
  });
}

// POST - Create a new quote
export async function POST(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();

    // Validate quote data
    const validationErrors = validateQuoteData(body);
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

    // Validate client exists
    if (!Types.ObjectId.isValid(body.client)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid client ID format",
        },
        { status: 400 }
      );
    }

    const client = await Client.findById(body.client);
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: "Client not found",
        },
        { status: 404 }
      );
    }

    // Validate and process quote items
    const processedItems = [];

    for (const item of body.quoteItems) {
      if (!Types.ObjectId.isValid(item.stockItem)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid stock item ID: ${item.stockItem}`,
          },
          { status: 400 }
        );
      }

      const stockItem = await StockItem.findById(item.stockItem);
      if (!stockItem) {
        return NextResponse.json(
          {
            success: false,
            error: `Stock item not found: ${item.stockItem}`,
          },
          { status: 404 }
        );
      }

      if (!stockItem.isActive) {
        return NextResponse.json(
          {
            success: false,
            error: `Stock item ${stockItem.code} is not active`,
          },
          { status: 400 }
        );
      }

      // Determine price based on client's price category
      let price = item.price;
      if (!price) {
        // Auto-determine price based on client's price category
        const clientCategory = client.priceCategory;
        if (clientCategory === "A" && stockItem.priceCategory?.sellingA) {
          price = stockItem.priceCategory.sellingA;
        } else if (
          clientCategory === "B" &&
          stockItem.priceCategory?.sellingB
        ) {
          price = stockItem.priceCategory.sellingB;
        } else if (clientCategory === "C") {
          price = stockItem.price.sellingC;
        } else if (
          clientCategory === "D" &&
          stockItem.priceCategory?.sellingD
        ) {
          price = stockItem.priceCategory.sellingD;
        } else if (
          clientCategory === "E" &&
          stockItem.priceCategory?.sellingE
        ) {
          price = stockItem.priceCategory.sellingE;
        } else {
          price = stockItem.price.sellingC; // Default to sellingC
        }
      }

      // Use provided VAT rate or default from stock item
      const vatRate =
        item.VATRate !== undefined ? item.VATRate : stockItem.price.VAT;

      // Prepare item for quote
      processedItems.push({
        stockItem: stockItem._id,
        qty: item.qty,
        price: price,
        VATRate: vatRate,
      });
    }

    // Prepare quote data
    const quoteData = {
      date: body.date ? new Date(body.date) : new Date(),
      client: client._id,
      description: body.description?.trim(),
      quoteItems: processedItems,
      subTotal: 0, // Will be calculated by pre-save middleware
      totalDue: 0, // Will be calculated by pre-save middleware
    };

    // Create quote - totals will be calculated by pre-save middleware
    const quote = await Quote.create(quoteData);

    // Format response
    const formattedQuote = await formatQuoteResponse(quote);

    return NextResponse.json(
      {
        success: true,
        message: "Quote created successfully",
        data: formattedQuote,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating quote:", error);

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
        error: "Failed to create quote",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Update an existing quote
export async function PUT(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid quote ID format",
        },
        { status: 400 }
      );
    }

    // Check if quote exists
    const existingQuote = await Quote.findById(id);
    if (!existingQuote) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote not found",
        },
        { status: 404 }
      );
    }

    // Check if quote has been converted to invoice
    if (existingQuote.convertedToInvoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot update quote that has been converted to invoice",
        },
        { status: 400 }
      );
    }

    // Allow updates to most fields except client (client change would be a new quote)
    const allowedUpdates = ["date", "description", "quoteItems"];
    const invalidUpdates = Object.keys(updateData).filter(
      (key) => !allowedUpdates.includes(key)
    );

    if (invalidUpdates.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Only date, description, and quoteItems can be updated",
          invalidFields: invalidUpdates,
        },
        { status: 400 }
      );
    }

    // Validate date if being updated
    if (updateData.date) {
      const date = new Date(updateData.date);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid date format",
          },
          { status: 400 }
        );
      }
      updateData.date = date;
    }

    // Validate and process quote items if being updated
    if (updateData.quoteItems) {
      if (
        !Array.isArray(updateData.quoteItems) ||
        updateData.quoteItems.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "At least one quote item is required",
          },
          { status: 400 }
        );
      }

      const client = await Client.findById(existingQuote.client);
      const processedItems = [];

      for (const item of updateData.quoteItems) {
        if (!Types.ObjectId.isValid(item.stockItem)) {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid stock item ID: ${item.stockItem}`,
            },
            { status: 400 }
          );
        }

        const stockItem = await StockItem.findById(item.stockItem);
        if (!stockItem) {
          return NextResponse.json(
            {
              success: false,
              error: `Stock item not found: ${item.stockItem}`,
            },
            { status: 404 }
          );
        }

        if (!stockItem.isActive) {
          return NextResponse.json(
            {
              success: false,
              error: `Stock item ${stockItem.code} is not active`,
            },
            { status: 400 }
          );
        }

        // Determine price based on client's price category
        let price = item.price;
        if (!price && client) {
          const clientCategory = client.priceCategory;
          if (clientCategory === "A" && stockItem.priceCategory?.sellingA) {
            price = stockItem.priceCategory.sellingA;
          } else if (
            clientCategory === "B" &&
            stockItem.priceCategory?.sellingB
          ) {
            price = stockItem.priceCategory.sellingB;
          } else if (clientCategory === "C") {
            price = stockItem.price.sellingC;
          } else if (
            clientCategory === "D" &&
            stockItem.priceCategory?.sellingD
          ) {
            price = stockItem.priceCategory.sellingD;
          } else if (
            clientCategory === "E" &&
            stockItem.priceCategory?.sellingE
          ) {
            price = stockItem.priceCategory.sellingE;
          } else {
            price = stockItem.price.sellingC;
          }
        }

        // Use provided VAT rate or default from stock item
        const vatRate =
          item.VATRate !== undefined ? item.VATRate : stockItem.price.VAT;

        // Validate VAT rate
        if (vatRate < 0 || vatRate > 100) {
          return NextResponse.json(
            {
              success: false,
              error: `VAT rate must be between 0-100% for item ${stockItem.code}`,
            },
            { status: 400 }
          );
        }

        processedItems.push({
          stockItem: stockItem._id,
          qty: item.qty,
          price: price,
          VATRate: vatRate,
        });
      }

      updateData.quoteItems = processedItems;
    }

    // Trim description if provided
    if (updateData.description) {
      updateData.description = updateData.description.trim();
    }

    // Update quote
    const updatedQuote = await Quote.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const formattedQuote = await formatQuoteResponse(updatedQuote);

    return NextResponse.json({
      success: true,
      message: "Quote updated successfully",
      data: formattedQuote,
    });
  } catch (error: any) {
    console.error("Error updating quote:", error);

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
        error: "Failed to update quote",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a quote
export async function DELETE(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid quote ID format",
        },
        { status: 400 }
      );
    }

    // Check if quote exists
    const existingQuote = await Quote.findById(id);
    if (!existingQuote) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote not found",
        },
        { status: 404 }
      );
    }

    // Check if quote has been converted to invoice
    if (existingQuote.convertedToInvoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete quote that has been converted to invoice",
        },
        { status: 400 }
      );
    }

    // Delete quote
    await Quote.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Quote deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting quote:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete quote",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH - Partial update
export async function PATCH(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid quote ID format",
        },
        { status: 400 }
      );
    }

    // Check if quote exists
    const existingQuote = await Quote.findById(id);
    if (!existingQuote) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote not found",
        },
        { status: 404 }
      );
    }

    // Check if quote has been converted to invoice
    if (existingQuote.convertedToInvoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot update quote that has been converted to invoice",
        },
        { status: 400 }
      );
    }

    // Only allow specific fields to be updated via PATCH
    const allowedUpdates = ["description"];
    const invalidUpdates = Object.keys(updateData).filter(
      (key) => !allowedUpdates.includes(key)
    );

    if (invalidUpdates.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Only description can be updated via PATCH",
          invalidFields: invalidUpdates,
        },
        { status: 400 }
      );
    }

    // Trim description if provided
    if (updateData.description) {
      updateData.description = updateData.description.trim();
    }

    // Update quote
    const updatedQuote = await Quote.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const formattedQuote = await formatQuoteResponse(updatedQuote);

    return NextResponse.json({
      success: true,
      message: "Quote updated successfully",
      data: formattedQuote,
    });
  } catch (error: any) {
    console.error("Error patching quote:", error);

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
        error: "Failed to update quote",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Special endpoint for duplicating a quote
export async function POST_DUPLICATE(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { quoteId, newClientId } = body;

    if (!quoteId) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(quoteId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid quote ID format",
        },
        { status: 400 }
      );
    }

    // Check if quote exists
    const existingQuote = await Quote.findById(quoteId);
    if (!existingQuote) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote not found",
        },
        { status: 404 }
      );
    }

    // Validate new client if provided
    let client = existingQuote.client;
    if (newClientId) {
      if (!Types.ObjectId.isValid(newClientId)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid client ID format",
          },
          { status: 400 }
        );
      }

      const newClient = await Client.findById(newClientId);
      if (!newClient) {
        return NextResponse.json(
          {
            success: false,
            error: "New client not found",
          },
          { status: 404 }
        );
      }

      client = newClient._id;
    }

    // Create duplicate quote data
    const duplicateData = {
      date: new Date(),
      client: client,
      description: `Duplicate of ${existingQuote.number}${
        newClientId ? " (for new client)" : ""
      }`,
      quoteItems: existingQuote.quoteItems.map((item: any) => ({
        stockItem: item.stockItem,
        qty: item.qty,
        price: item.price,
        VATRate: item.VATRate,
      })),
    };

    // Create duplicate quote
    const duplicateQuote = await Quote.create(duplicateData);

    // Format response
    const formattedQuote = await formatQuoteResponse(duplicateQuote);

    return NextResponse.json(
      {
        success: true,
        message: "Quote duplicated successfully",
        data: formattedQuote,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error duplicating quote:", error);

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
        error: "Failed to duplicate quote",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Special endpoint for marking quote as converted to invoice
export async function PATCH_MARK_CONVERTED(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { quoteId, invoiceId } = body;

    if (!quoteId || !invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote ID and Invoice ID are required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectIds
    if (
      !Types.ObjectId.isValid(quoteId) ||
      !Types.ObjectId.isValid(invoiceId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid ID format",
        },
        { status: 400 }
      );
    }

    // Check if quote exists
    const existingQuote = await Quote.findById(quoteId);
    if (!existingQuote) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote not found",
        },
        { status: 404 }
      );
    }

    // Check if quote is already converted
    if (existingQuote.convertedToInvoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote is already converted to invoice",
        },
        { status: 400 }
      );
    }

    // Check if invoice exists
    const Invoice = (await import("@/lib/models/Invoice")).default;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice not found",
        },
        { status: 404 }
      );
    }

    // Check if invoice was created from this quote (optional validation)
    // This would require storing quote reference in invoice model

    // Update quote as converted
    const updatedQuote = await Quote.findByIdAndUpdate(
      quoteId,
      {
        $set: {
          convertedToInvoice: true,
          invoiceReference: invoiceId,
        },
      },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const formattedQuote = await formatQuoteResponse(updatedQuote);

    return NextResponse.json({
      success: true,
      message: "Quote marked as converted successfully",
      data: {
        ...formattedQuote,
        status: "Converted",
        invoiceDetails: {
          _id: invoice._id.toString(),
          number: invoice.number,
          date: invoice.date,
          totalDue: invoice.totalDue,
        },
      },
    });
  } catch (error: any) {
    console.error("Error marking quote as converted:", error);

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
        error: "Failed to mark quote as converted",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Special endpoint for quote analytics
export async function GET_ANALYTICS(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const clientId = searchParams.get("clientId");

    // Build query
    const query: any = {};

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

    // Client filter
    if (clientId && Types.ObjectId.isValid(clientId)) {
      query.client = new Types.ObjectId(clientId);
    }

    // Get all quotes in date range
    const quotes = await Quote.find(query)
      .populate("client", "companyName priceCategory")
      .lean();

    // Calculate analytics
    const analytics = {
      totalQuotes: quotes.length,
      totalValue: quotes.reduce((sum, q) => sum + q.totalDue, 0),
      averageQuoteValue:
        quotes.length > 0
          ? quotes.reduce((sum, q) => sum + q.totalDue, 0) / quotes.length
          : 0,
      conversionRate:
        quotes.length > 0
          ? (quotes.filter((q) => q.convertedToInvoice).length /
              quotes.length) *
            100
          : 0,

      // Status breakdown
      statusBreakdown: {
        active: quotes.filter((q) => getQuoteStatus(q) === "Active").length,
        expired: quotes.filter((q) => getQuoteStatus(q) === "Expired").length,
        converted: quotes.filter((q) => getQuoteStatus(q) === "Converted")
          .length,
      },

      // Monthly trend (last 6 months)
      monthlyTrend: await getMonthlyTrend(),

      // Top clients by quote value
      topClients: await getTopClients(query),

      // Most quoted items
      topItems: await getTopItems(query),
    };

    // Format values
    const formattedAnalytics = {
      ...analytics,
      formattedTotalValue: analytics.totalValue.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      formattedAverageQuoteValue: analytics.averageQuoteValue.toLocaleString(
        "en-ZA",
        {
          style: "currency",
          currency: "ZAR",
        }
      ),
      conversionRateFormatted: `${analytics.conversionRate.toFixed(1)}%`,
    };

    return NextResponse.json({
      success: true,
      data: formattedAnalytics,
    });
  } catch (error: any) {
    console.error("Error getting quote analytics:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get quote analytics",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function for monthly trend
async function getMonthlyTrend() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const quotes = await Quote.aggregate([
    {
      $match: {
        date: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
        },
        count: { $sum: 1 },
        totalValue: { $sum: "$totalDue" },
        convertedCount: {
          $sum: { $cond: [{ $eq: ["$convertedToInvoice", true] }, 1, 0] },
        },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  return quotes.map((q) => ({
    month: `${q._id.year}-${q._id.month.toString().padStart(2, "0")}`,
    count: q.count,
    totalValue: q.totalValue,
    convertedCount: q.convertedCount,
    formattedTotalValue: q.totalValue.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
  }));
}

// Helper function for top clients
async function getTopClients(query: any) {
  const topClients = await Quote.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$client",
        count: { $sum: 1 },
        totalValue: { $sum: "$totalDue" },
        convertedCount: {
          $sum: { $cond: [{ $eq: ["$convertedToInvoice", true] }, 1, 0] },
        },
      },
    },
    { $sort: { totalValue: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "clients",
        localField: "_id",
        foreignField: "_id",
        as: "clientDetails",
      },
    },
    { $unwind: "$clientDetails" },
  ]);

  return topClients.map((c) => ({
    clientId: c._id,
    companyName: c.clientDetails.companyName,
    count: c.count,
    totalValue: c.totalValue,
    convertedCount: c.convertedCount,
    conversionRate: c.count > 0 ? (c.convertedCount / c.count) * 100 : 0,
    formattedTotalValue: c.totalValue.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    conversionRateFormatted:
      c.count > 0
        ? `${((c.convertedCount / c.count) * 100).toFixed(1)}%`
        : "0%",
  }));
}

// Helper function for top items
async function getTopItems(query: any) {
  const topItems = await Quote.aggregate([
    { $match: query },
    { $unwind: "$quoteItems" },
    {
      $group: {
        _id: "$quoteItems.stockItem",
        count: { $sum: 1 },
        totalQty: { $sum: "$quoteItems.qty" },
        totalValue: {
          $sum: { $multiply: ["$quoteItems.qty", "$quoteItems.price"] },
        },
      },
    },
    { $sort: { totalValue: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "stockitems",
        localField: "_id",
        foreignField: "_id",
        as: "itemDetails",
      },
    },
    { $unwind: "$itemDetails" },
  ]);

  return topItems.map((i) => ({
    itemId: i._id,
    code: i.itemDetails.code,
    name: i.itemDetails.name,
    count: i.count,
    totalQty: i.totalQty,
    totalValue: i.totalValue,
    formattedTotalValue: i.totalValue.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
  }));
}
