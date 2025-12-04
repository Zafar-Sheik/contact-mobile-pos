// app/api/invoice/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Invoice, { IInvoice } from "@/lib/models/Invoice";
import StockItem from "@/lib/models/StockItem";
import Client from "@/lib/models/Client";
import { Types } from "mongoose";

// Helper function to validate invoice data
function validateInvoiceData(body: any) {
  const errors: string[] = [];

  // Check required fields
  if (!body.client) errors.push("Client is required");
  if (!body.type) errors.push("Invoice type is required");
  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push("At least one item is required");
  }

  // Validate type
  if (body.type && !["VAT", "non VAT"].includes(body.type)) {
    errors.push("Invoice type must be 'VAT' or 'non VAT'");
  }

  // Validate items
  if (Array.isArray(body.items)) {
    body.items.forEach((item: any, index: number) => {
      if (!item.stockItem)
        errors.push(`Item ${index + 1}: Stock item is required`);
      if (!item.qty || item.qty <= 0)
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      if (!item.price || item.price < 0)
        errors.push(`Item ${index + 1}: Price cannot be negative`);
      if (body.type === "VAT" && item.VATRate === undefined) {
        errors.push(`Item ${index + 1}: VAT rate is required for VAT invoices`);
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

// Helper function to format invoice response
async function formatInvoiceResponse(invoice: any) {
  const populated = await Invoice.findById(invoice._id)
    .populate(
      "client",
      "customerCode companyName owner address cellNo email priceCategory"
    )
    .populate("items.stockItem", "code name category price priceCategory")
    .lean();

  if (!populated) return invoice;

  // Format items with additional details
  const formattedItems = populated.items.map((item: any) => {
    const stockItem = item.stockItem;
    const lineTotal = item.qty * item.price;
    let vatAmount = 0;

    if (populated.type === "VAT") {
      vatAmount = (lineTotal * (item.VATRate || 15)) / 100;
    }

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
    items: formattedItems,
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

// GET - Fetch all invoices or single invoice
export async function GET(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const number = searchParams.get("number");

    // If ID or number is provided, fetch single invoice
    if (id || number) {
      return await getSingleInvoice(id, number);
    }

    // Otherwise fetch all invoices with filters
    return await getAllInvoices(request);
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

// Helper function to get all invoices
async function getAllInvoices(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const sortBy = searchParams.get("sortBy") || "date";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const client = searchParams.get("client");
  const type = searchParams.get("type");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const status = searchParams.get("status"); // Paid, Partial, Unpaid (would need payment data)

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

  if (type) {
    query.type = type;
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

  // Amount range filter (would need to filter after aggregation)

  // Sorting
  const sort: any = {};
  sort[sortBy] = sortOrder;

  // Execute queries with population
  const [invoices, totalCount] = await Promise.all([
    Invoice.find(query)
      .populate("client", "customerCode companyName")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(query),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / limit);

  // Format response data with totals
  const formattedInvoices = await Promise.all(
    invoices.map(async (invoice: any) => {
      const formatted = await formatInvoiceResponse(invoice);

      // Get payment status (simplified - would need payment data integration)
      let paymentStatus = "Unpaid";
      let amountPaid = 0;
      let balance = formatted.totalDue;

      // This would be replaced with actual payment lookup
      // const payments = await Payment.find({ invoice: invoice._id });
      // amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      // balance = formatted.totalDue - amountPaid;
      // paymentStatus = balance <= 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid';

      return {
        ...formatted,
        paymentStatus,
        amountPaid,
        balance,
        formattedAmountPaid: amountPaid.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
        formattedBalance: balance.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
      };
    })
  );

  // Filter by amount range if specified
  let filteredInvoices = formattedInvoices;
  if (minAmount) {
    const min = parseFloat(minAmount);
    filteredInvoices = filteredInvoices.filter((inv) => inv.totalDue >= min);
  }
  if (maxAmount) {
    const max = parseFloat(maxAmount);
    filteredInvoices = filteredInvoices.filter((inv) => inv.totalDue <= max);
  }

  // Calculate summary statistics
  const summary = {
    totalInvoices: filteredInvoices.length,
    totalAmount: filteredInvoices.reduce((sum, inv) => sum + inv.totalDue, 0),
    totalVAT: filteredInvoices.reduce((sum, inv) => sum + inv.vatTotal, 0),
    totalItems: filteredInvoices.reduce((sum, inv) => sum + inv.totalQty, 0),
    vatInvoices: filteredInvoices.filter((inv) => inv.type === "VAT").length,
    nonVatInvoices: filteredInvoices.filter((inv) => inv.type === "non VAT")
      .length,
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
    data: filteredInvoices,
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

// Helper function to get single invoice
async function getSingleInvoice(id: string | null, number: string | null) {
  let query: any = {};

  if (id) {
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid invoice ID format",
        },
        { status: 400 }
      );
    }
    query._id = new Types.ObjectId(id);
  } else if (number) {
    query.number = number;
  }

  const invoice = await Invoice.findOne(query).lean();

  if (!invoice) {
    return NextResponse.json(
      {
        success: false,
        error: "Invoice not found",
      },
      { status: 404 }
    );
  }

  // Format the invoice with full details
  const formattedInvoice = await formatInvoiceResponse(invoice);

  // Get related payments
  const Payment = (await import("@/lib/models/Payment")).default;
  const payments = await Payment.find({ invoice: invoice._id })
    .sort({ date: -1 })
    .lean();

  const amountPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balance = formattedInvoice.totalDue - amountPaid;
  const paymentStatus =
    balance <= 0 ? "Paid" : amountPaid > 0 ? "Partial" : "Unpaid";

  const invoiceWithPayments = {
    ...formattedInvoice,
    payments: payments.map((payment) => ({
      ...payment,
      _id: payment._id.toString(),
      formattedAmount: payment.amount.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      formattedDate: new Date(payment.date).toLocaleDateString("en-ZA"),
    })),
    paymentInfo: {
      amountPaid,
      balance,
      paymentStatus,
      formattedAmountPaid: amountPaid.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
      formattedBalance: balance.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
    },
  };

  return NextResponse.json({
    success: true,
    data: invoiceWithPayments,
  });
}

// POST - Create a new invoice
export async function POST(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();

    // Validate invoice data
    const validationErrors = validateInvoiceData(body);
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

    // Validate and process items
    const processedItems = [];
    const stockUpdates = [];

    for (const item of body.items) {
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

      // Check stock availability
      if (stockItem.qty < item.qty) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for ${stockItem.code}. Available: ${stockItem.qty}, Requested: ${item.qty}`,
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

      // Prepare item for invoice
      processedItems.push({
        stockItem: stockItem._id,
        qty: item.qty,
        price: price,
        VATRate:
          body.type === "VAT" ? item.VATRate || stockItem.price.VAT : undefined,
      });

      // Prepare stock update
      stockUpdates.push({
        stockItemId: stockItem._id,
        qty: item.qty,
      });
    }

    // Check client credit limit
    const totalAmount = processedItems.reduce(
      (sum, item) => sum + item.qty * item.price,
      0
    );
    const vatAmount =
      body.type === "VAT"
        ? processedItems.reduce(
            (sum, item) =>
              sum + (item.qty * item.price * (item.VATRate || 15)) / 100,
            0
          )
        : 0;
    const totalDue = totalAmount + vatAmount;

    // Get client's outstanding balance (would need to calculate from unpaid invoices)
    // For now, just check credit limit
    if (client.creditLimit > 0 && totalDue > client.creditLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `Invoice amount (R${totalDue.toFixed(
            2
          )}) exceeds client credit limit (R${client.creditLimit.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Prepare invoice data
    const invoiceData = {
      date: body.date ? new Date(body.date) : new Date(),
      client: client._id,
      type: body.type,
      description: body.description?.trim(),
      items: processedItems,
    };

    // Create invoice - totals will be calculated by pre-save middleware
    const invoice = await Invoice.create(invoiceData);

    // Update stock quantities
    for (const update of stockUpdates) {
      await StockItem.findByIdAndUpdate(update.stockItemId, {
        $inc: { qty: -update.qty },
      });
    }

    // Format response
    const formattedInvoice = await formatInvoiceResponse(invoice);

    return NextResponse.json(
      {
        success: true,
        message: "Invoice created successfully",
        data: formattedInvoice,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating invoice:", error);

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
        error: "Failed to create invoice",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Update an existing invoice (limited - typically invoices shouldn't be updated after creation)
export async function PUT(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid invoice ID format",
        },
        { status: 400 }
      );
    }

    // Check if invoice exists
    const existingInvoice = await Invoice.findById(id);
    if (!existingInvoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice not found",
        },
        { status: 404 }
      );
    }

    // Typically, invoices shouldn't be updated after creation
    // Allow only certain fields to be updated
    const allowedUpdates = ["description", "date"];
    const invalidUpdates = Object.keys(updateData).filter(
      (key) => !allowedUpdates.includes(key)
    );

    if (invalidUpdates.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Only description and date can be updated",
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

    // Trim description if provided
    if (updateData.description) {
      updateData.description = updateData.description.trim();
    }

    // Update invoice
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const formattedInvoice = await formatInvoiceResponse(updatedInvoice);

    return NextResponse.json({
      success: true,
      message: "Invoice updated successfully",
      data: formattedInvoice,
    });
  } catch (error: any) {
    console.error("Error updating invoice:", error);

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
        error: "Failed to update invoice",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete an invoice (with stock restoration)
export async function DELETE(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid invoice ID format",
        },
        { status: 400 }
      );
    }

    // Check if invoice exists
    const existingInvoice = await Invoice.findById(id)
      .populate("items.stockItem", "code qty")
      .lean();

    if (!existingInvoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice not found",
        },
        { status: 404 }
      );
    }

    // Check if invoice has payments
    const Payment = (await import("@/lib/models/Payment")).default;
    const hasPayments = await Payment.exists({ invoice: id });

    if (hasPayments) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete invoice with payments. Create a credit note instead.",
        },
        { status: 400 }
      );
    }

    // Restore stock quantities
    for (const item of existingInvoice.items) {
      await StockItem.findByIdAndUpdate(item.stockItem._id, {
        $inc: { qty: item.qty },
      });
    }

    // Delete invoice
    await Invoice.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message:
        "Invoice deleted successfully. Stock quantities have been restored.",
    });
  } catch (error: any) {
    console.error("Error deleting invoice:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete invoice",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH - Partial update (typically for adding notes or marking as paid)
export async function PATCH(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid invoice ID format",
        },
        { status: 400 }
      );
    }

    // Check if invoice exists
    const existingInvoice = await Invoice.findById(id);
    if (!existingInvoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice not found",
        },
        { status: 404 }
      );
    }

    // Only allow specific fields to be updated
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

    // Update invoice
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const formattedInvoice = await formatInvoiceResponse(updatedInvoice);

    return NextResponse.json({
      success: true,
      message: "Invoice updated successfully",
      data: formattedInvoice,
    });
  } catch (error: any) {
    console.error("Error patching invoice:", error);

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
        error: "Failed to update invoice",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Special endpoint for generating invoice from quote
export async function POST_GENERATE_FROM_QUOTE(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { quoteId } = body;

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

    // Get quote
    const Quote = (await import("@/lib/models/Quote")).default;
    const quote = await Quote.findById(quoteId)
      .populate("client")
      .populate("quoteItems.stockItem")
      .lean();

    if (!quote) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote not found",
        },
        { status: 404 }
      );
    }

    // Convert quote items to invoice items
    const invoiceItems = quote.quoteItems.map((item: any) => ({
      stockItem: item.stockItem._id,
      qty: item.qty,
      price: item.price,
      VATRate: item.VATRate,
    }));

    // Check stock availability
    const stockUpdates = [];
    for (const item of invoiceItems) {
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

      if (stockItem.qty < item.qty) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for ${stockItem.code}. Available: ${stockItem.qty}, Requested: ${item.qty}`,
          },
          { status: 400 }
        );
      }

      stockUpdates.push({
        stockItemId: stockItem._id,
        qty: item.qty,
      });
    }

    // Check client credit limit
    const client = quote.client;
    const totalAmount = invoiceItems.reduce(
      (sum: number, item: any) => sum + item.qty * item.price,
      0
    );
    const vatAmount = invoiceItems.reduce(
      (sum: number, item: any) =>
        sum + (item.qty * item.price * (item.VATRate || 15)) / 100,
      0
    );
    const totalDue = totalAmount + vatAmount;

    if (client.creditLimit > 0 && totalDue > client.creditLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `Invoice amount exceeds client credit limit`,
        },
        { status: 400 }
      );
    }

    // Create invoice from quote
    const invoiceData = {
      date: new Date(),
      client: client._id,
      type: "VAT", // Assuming VAT invoice
      description: `Generated from quote ${quote.number}`,
      items: invoiceItems,
    };

    const invoice = await Invoice.create(invoiceData);

    // Update stock quantities
    for (const update of stockUpdates) {
      await StockItem.findByIdAndUpdate(update.stockItemId, {
        $inc: { qty: -update.qty },
      });
    }

    // Update quote status (you might want to add a status field to Quote model)
    await Quote.findByIdAndUpdate(quoteId, {
      $set: { convertedToInvoice: true, invoiceReference: invoice._id },
    });

    // Format response
    const formattedInvoice = await formatInvoiceResponse(invoice);

    return NextResponse.json(
      {
        success: true,
        message: "Invoice generated from quote successfully",
        data: formattedInvoice,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error generating invoice from quote:", error);

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
        error: "Failed to generate invoice from quote",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
