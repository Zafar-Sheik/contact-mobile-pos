// app/api/payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Payment, { IPayment } from "@/lib/models/Payment";
import Invoice from "@/lib/models/Invoice";
import Client from "@/lib/models/Client";
import { Types } from "mongoose";

// Helper function to validate payment data
function validatePaymentData(body: any) {
  const errors: string[] = [];

  // Check required fields
  if (!body.client) errors.push("Client is required");
  if (!body.amount || body.amount <= 0)
    errors.push("Amount must be greater than 0");
  if (!body.method) errors.push("Payment method is required");
  if (!body.allocationType) errors.push("Allocation type is required");

  // Validate method
  if (body.method && !["EFT", "Cash"].includes(body.method)) {
    errors.push("Payment method must be 'EFT' or 'Cash'");
  }

  // Validate allocation type
  if (
    body.allocationType &&
    !["balanceBroughtForward", "selectedInvoice"].includes(body.allocationType)
  ) {
    errors.push(
      "Allocation type must be 'balanceBroughtForward' or 'selectedInvoice'"
    );
  }

  // Validate invoice for selectedInvoice allocation
  if (body.allocationType === "selectedInvoice" && !body.invoice) {
    errors.push("Invoice is required for selectedInvoice allocation");
  }

  return errors;
}

// Helper function to format payment response
async function formatPaymentResponse(payment: any) {
  const populated = await Payment.findById(payment._id)
    .populate("client", "customerCode companyName owner")
    .populate("invoice", "number date totalDue")
    .lean();

  if (!populated) return payment;

  return {
    ...populated,
    _id: populated._id.toString(),
    formattedDate: new Date(populated.date).toLocaleDateString("en-ZA"),
    formattedAmount: populated.amount.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    client: populated.client
      ? {
          ...populated.client,
          _id: populated.client._id.toString(),
        }
      : null,
    invoice: populated.invoice
      ? {
          ...populated.invoice,
          _id: populated.invoice._id.toString(),
          formattedDate: new Date(populated.invoice.date).toLocaleDateString(
            "en-ZA"
          ),
          formattedTotalDue: populated.invoice.totalDue.toLocaleString(
            "en-ZA",
            {
              style: "currency",
              currency: "ZAR",
            }
          ),
        }
      : null,
  };
}

// Helper function to calculate client balance
async function calculateClientBalance(clientId: Types.ObjectId) {
  // Get all invoices for client
  const invoices = await Invoice.find({ client: clientId }).lean();

  // Get all payments for client
  const payments = await Payment.find({ client: clientId }).lean();

  // Calculate total invoiced amount
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalDue, 0);

  // Calculate total payments
  const totalPayments = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  // Calculate outstanding balance
  const balance = totalInvoiced - totalPayments;

  return {
    totalInvoiced,
    totalPayments,
    balance,
    formattedTotalInvoiced: totalInvoiced.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    formattedTotalPayments: totalPayments.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    formattedBalance: balance.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
  };
}

// GET - Fetch all payments or single payment
export async function GET(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    // If ID is provided, fetch single payment
    if (id) {
      return await getSinglePayment(id);
    }

    // Otherwise fetch all payments with filters
    return await getAllPayments(request);
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

// Helper function to get all payments
async function getAllPayments(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const sortBy = searchParams.get("sortBy") || "date";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const client = searchParams.get("client");
  const method = searchParams.get("method");
  const allocationType = searchParams.get("allocationType");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");

  const skip = (page - 1) * limit;

  // Build query
  const query: any = {};

  if (search) {
    query.$or = [
      { "client.companyName": { $regex: search, $options: "i" } },
      { "client.customerCode": { $regex: search, $options: "i" } },
      { "invoice.number": { $regex: search, $options: "i" } },
    ];
  }

  if (client && Types.ObjectId.isValid(client)) {
    query.client = new Types.ObjectId(client);
  }

  if (method) {
    query.method = method;
  }

  if (allocationType) {
    query.allocationType = allocationType;
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
  if (minAmount) {
    query.amount = { $gte: parseFloat(minAmount) };
  }
  if (maxAmount) {
    if (query.amount) {
      query.amount.$lte = parseFloat(maxAmount);
    } else {
      query.amount = { $lte: parseFloat(maxAmount) };
    }
  }

  // Sorting
  const sort: any = {};
  sort[sortBy] = sortOrder;

  // Execute queries with population
  const [payments, totalCount] = await Promise.all([
    Payment.find(query)
      .populate("client", "customerCode companyName")
      .populate("invoice", "number")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(query),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / limit);

  // Format response data
  const formattedPayments = payments.map((payment) => ({
    ...payment,
    _id: payment._id.toString(),
    formattedDate: new Date(payment.date).toLocaleDateString("en-ZA"),
    formattedAmount: payment.amount.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    client: payment.client
      ? {
          ...payment.client,
          _id: payment.client._id.toString(),
        }
      : null,
    invoice: payment.invoice
      ? {
          ...payment.invoice,
          _id: payment.invoice._id.toString(),
        }
      : null,
  }));

  // Calculate summary statistics
  const summary = {
    totalPayments: formattedPayments.length,
    totalAmount: formattedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    ),
    cashPayments: formattedPayments.filter((p) => p.method === "Cash").length,
    eftPayments: formattedPayments.filter((p) => p.method === "EFT").length,
    invoicePayments: formattedPayments.filter(
      (p) => p.allocationType === "selectedInvoice"
    ).length,
    balancePayments: formattedPayments.filter(
      (p) => p.allocationType === "balanceBroughtForward"
    ).length,
    averagePayment:
      formattedPayments.length > 0
        ? formattedPayments.reduce((sum, p) => sum + p.amount, 0) /
          formattedPayments.length
        : 0,
  };

  // Format summary values
  const formattedSummary = {
    ...summary,
    formattedTotalAmount: summary.totalAmount.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
    formattedAveragePayment: summary.averagePayment.toLocaleString("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }),
  };

  return NextResponse.json({
    success: true,
    data: formattedPayments,
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

// Helper function to get single payment
async function getSinglePayment(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid payment ID format",
      },
      { status: 400 }
    );
  }

  const payment = await Payment.findById(id)
    .populate("client")
    .populate("invoice")
    .lean();

  if (!payment) {
    return NextResponse.json(
      {
        success: false,
        error: "Payment not found",
      },
      { status: 404 }
    );
  }

  // Format the payment with full details
  const formattedPayment = await formatPaymentResponse(payment);

  // Get client's payment history
  const clientPayments = await Payment.find({ client: payment.client._id })
    .sort({ date: -1 })
    .limit(10)
    .lean();

  // Calculate client balance
  const clientBalance = await calculateClientBalance(payment.client._id);

  const paymentWithDetails = {
    ...formattedPayment,
    clientDetails: {
      ...payment.client,
      _id: payment.client._id.toString(),
      balance: clientBalance,
    },
    paymentHistory: clientPayments.map((p) => ({
      ...p,
      _id: p._id.toString(),
      formattedDate: new Date(p.date).toLocaleDateString("en-ZA"),
      formattedAmount: p.amount.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
    })),
  };

  return NextResponse.json({
    success: true,
    data: paymentWithDetails,
  });
}

// POST - Create a new payment
export async function POST(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();

    // Validate payment data
    const validationErrors = validatePaymentData(body);
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

    // Validate invoice if provided
    let invoice = null;
    if (body.invoice) {
      if (!Types.ObjectId.isValid(body.invoice)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid invoice ID format",
          },
          { status: 400 }
        );
      }

      invoice = await Invoice.findById(body.invoice);
      if (!invoice) {
        return NextResponse.json(
          {
            success: false,
            error: "Invoice not found",
          },
          { status: 404 }
        );
      }

      // Check if invoice belongs to client
      if (invoice.client.toString() !== body.client) {
        return NextResponse.json(
          {
            success: false,
            error: "Invoice does not belong to this client",
          },
          { status: 400 }
        );
      }

      // Check allocation type consistency
      if (body.allocationType !== "selectedInvoice") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invoice allocation requires selectedInvoice allocation type",
          },
          { status: 400 }
        );
      }

      // Check if payment exceeds invoice balance
      const existingPayments = await Payment.find({ invoice: invoice._id });
      const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = invoice.totalDue - totalPaid;

      if (body.amount > outstanding) {
        return NextResponse.json(
          {
            success: false,
            error: `Payment amount (R${body.amount.toFixed(
              2
            )}) exceeds invoice outstanding balance (R${outstanding.toFixed(
              2
            )})`,
          },
          { status: 400 }
        );
      }
    }

    // Validate allocation type consistency
    if (body.allocationType === "selectedInvoice" && !body.invoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected invoice allocation requires an invoice",
        },
        { status: 400 }
      );
    }

    if (body.allocationType === "balanceBroughtForward" && body.invoice) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Balance brought forward allocation should not have an invoice",
        },
        { status: 400 }
      );
    }

    // Check if payment exceeds client's outstanding balance
    const clientBalance = await calculateClientBalance(client._id);
    if (
      body.allocationType === "balanceBroughtForward" &&
      body.amount > clientBalance.balance
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount (R${body.amount.toFixed(
            2
          )}) exceeds client outstanding balance (R${clientBalance.balance.toFixed(
            2
          )})`,
        },
        { status: 400 }
      );
    }

    // Prepare payment data
    const paymentData = {
      date: body.date ? new Date(body.date) : new Date(),
      client: client._id,
      amount: parseFloat(body.amount),
      method: body.method,
      allocationType: body.allocationType,
      invoice: body.invoice ? new Types.ObjectId(body.invoice) : undefined,
    };

    // Create payment
    const payment = await Payment.create(paymentData);

    // Format response
    const formattedPayment = await formatPaymentResponse(payment);

    // Update client's last payment date (if you have that field)
    await Client.findByIdAndUpdate(client._id, {
      lastPaymentDate: paymentData.date,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Payment created successfully",
        data: formattedPayment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating payment:", error);

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
        error: "Failed to create payment",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Update an existing payment
export async function PUT(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment ID format",
        },
        { status: 400 }
      );
    }

    // Check if payment exists
    const existingPayment = await Payment.findById(id);
    if (!existingPayment) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment not found",
        },
        { status: 404 }
      );
    }

    // Typically, payments shouldn't be heavily modified after creation
    // Allow only certain fields to be updated
    const allowedUpdates = ["date", "method"];
    const invalidUpdates = Object.keys(updateData).filter(
      (key) => !allowedUpdates.includes(key)
    );

    if (invalidUpdates.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Only date and method can be updated",
          invalidFields: invalidUpdates,
        },
        { status: 400 }
      );
    }

    // Validate method if being updated
    if (updateData.method && !["EFT", "Cash"].includes(updateData.method)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment method must be "EFT" or "Cash"',
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

    // Update payment
    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const formattedPayment = await formatPaymentResponse(updatedPayment);

    return NextResponse.json({
      success: true,
      message: "Payment updated successfully",
      data: formattedPayment,
    });
  } catch (error: any) {
    console.error("Error updating payment:", error);

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
        error: "Failed to update payment",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a payment
export async function DELETE(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment ID format",
        },
        { status: 400 }
      );
    }

    // Check if payment exists
    const existingPayment = await Payment.findById(id);
    if (!existingPayment) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment not found",
        },
        { status: 404 }
      );
    }

    // Check if this is the only payment for an invoice
    // (In a real system, you might want to prevent deletion if it affects financial reporting)

    // Delete payment
    await Payment.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting payment:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete payment",
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
          error: "Payment ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment ID format",
        },
        { status: 400 }
      );
    }

    // Check if payment exists
    const existingPayment = await Payment.findById(id);
    if (!existingPayment) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment not found",
        },
        { status: 404 }
      );
    }

    // Only allow specific fields to be updated
    const allowedUpdates = ["method"];
    const invalidUpdates = Object.keys(updateData).filter(
      (key) => !allowedUpdates.includes(key)
    );

    if (invalidUpdates.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Only method can be updated via PATCH",
          invalidFields: invalidUpdates,
        },
        { status: 400 }
      );
    }

    // Validate method if provided
    if (updateData.method && !["EFT", "Cash"].includes(updateData.method)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment method must be "EFT" or "Cash"',
        },
        { status: 400 }
      );
    }

    // Update payment
    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const formattedPayment = await formatPaymentResponse(updatedPayment);

    return NextResponse.json({
      success: true,
      message: "Payment updated successfully",
      data: formattedPayment,
    });
  } catch (error: any) {
    console.error("Error patching payment:", error);

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
        error: "Failed to update payment",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Special endpoint for client balance and outstanding invoices
export async function GET_CLIENT_BALANCE(request: NextRequest) {
  await connectDB();

  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          error: "Client ID is required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(clientId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid client ID format",
        },
        { status: 400 }
      );
    }

    // Check if client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: "Client not found",
        },
        { status: 404 }
      );
    }

    // Get all invoices for client
    const invoices = await Invoice.find({ client: clientId })
      .sort({ date: -1 })
      .lean();

    // Get all payments for client
    const payments = await Payment.find({ client: clientId }).lean();

    // Calculate invoice balances
    const invoicesWithBalance = await Promise.all(
      invoices.map(async (invoice) => {
        const invoicePayments = payments.filter(
          (p) => p.invoice && p.invoice.toString() === invoice._id.toString()
        );

        const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
        const balance = invoice.totalDue - totalPaid;
        const paymentStatus =
          balance <= 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Unpaid";

        return {
          ...invoice,
          _id: invoice._id.toString(),
          formattedDate: new Date(invoice.date).toLocaleDateString("en-ZA"),
          formattedTotalDue: invoice.totalDue.toLocaleString("en-ZA", {
            style: "currency",
            currency: "ZAR",
          }),
          totalPaid,
          balance,
          paymentStatus,
          formattedTotalPaid: totalPaid.toLocaleString("en-ZA", {
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

    // Filter outstanding invoices
    const outstandingInvoices = invoicesWithBalance.filter(
      (inv) => inv.balance > 0
    );

    // Calculate totals
    const totalInvoiced = invoicesWithBalance.reduce(
      (sum, inv) => sum + inv.totalDue,
      0
    );
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = outstandingInvoices.reduce(
      (sum, inv) => sum + inv.balance,
      0
    );

    // Get payment history
    const paymentHistory = payments.map((payment) => ({
      ...payment,
      _id: payment._id.toString(),
      formattedDate: new Date(payment.date).toLocaleDateString("en-ZA"),
      formattedAmount: payment.amount.toLocaleString("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }),
    }));

    // Calculate aging
    const aging = {
      current: outstandingInvoices
        .filter((inv) => {
          const days = Math.floor(
            (Date.now() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24)
          );
          return days <= 30;
        })
        .reduce((sum, inv) => sum + inv.balance, 0),
      days31_60: outstandingInvoices
        .filter((inv) => {
          const days = Math.floor(
            (Date.now() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24)
          );
          return days > 30 && days <= 60;
        })
        .reduce((sum, inv) => sum + inv.balance, 0),
      days61_90: outstandingInvoices
        .filter((inv) => {
          const days = Math.floor(
            (Date.now() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24)
          );
          return days > 60 && days <= 90;
        })
        .reduce((sum, inv) => sum + inv.balance, 0),
      over90: outstandingInvoices
        .filter((inv) => {
          const days = Math.floor(
            (Date.now() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24)
          );
          return days > 90;
        })
        .reduce((sum, inv) => sum + inv.balance, 0),
    };

    const response = {
      client: {
        ...client.toObject(),
        _id: client._id.toString(),
        creditLimit: client.creditLimit,
        formattedCreditLimit: client.creditLimit.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
      },
      summary: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        creditAvailable: client.creditLimit - totalOutstanding,
        formattedTotalInvoiced: totalInvoiced.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
        formattedTotalPaid: totalPaid.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
        formattedTotalOutstanding: totalOutstanding.toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
        formattedCreditAvailable: (
          client.creditLimit - totalOutstanding
        ).toLocaleString("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }),
        aging: {
          ...aging,
          formattedCurrent: aging.current.toLocaleString("en-ZA", {
            style: "currency",
            currency: "ZAR",
          }),
          formattedDays31_60: aging.days31_60.toLocaleString("en-ZA", {
            style: "currency",
            currency: "ZAR",
          }),
          formattedDays61_90: aging.days61_90.toLocaleString("en-ZA", {
            style: "currency",
            currency: "ZAR",
          }),
          formattedOver90: aging.over90.toLocaleString("en-ZA", {
            style: "currency",
            currency: "ZAR",
          }),
        },
      },
      outstandingInvoices,
      paymentHistory: paymentHistory.slice(0, 10), // Last 10 payments
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error("Error getting client balance:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get client balance",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Special endpoint for allocating payments to invoices
export async function POST_ALLOCATE_PAYMENT(request: NextRequest) {
  await connectDB();

  try {
    const body = await request.json();
    const { paymentId, invoiceId } = body;

    if (!paymentId || !invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment ID and Invoice ID are required",
        },
        { status: 400 }
      );
    }

    // Validate ObjectIds
    if (
      !Types.ObjectId.isValid(paymentId) ||
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

    // Check if payment exists
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment not found",
        },
        { status: 404 }
      );
    }

    // Check if invoice exists
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

    // Check if payment is already allocated
    if (payment.invoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment is already allocated to an invoice",
        },
        { status: 400 }
      );
    }

    // Check if payment and invoice belong to same client
    if (payment.client.toString() !== invoice.client.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment and invoice must belong to the same client",
        },
        { status: 400 }
      );
    }

    // Check if payment amount exceeds invoice outstanding balance
    const existingPayments = await Payment.find({ invoice: invoice._id });
    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = invoice.totalDue - totalPaid;

    if (payment.amount > outstanding) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount (R${payment.amount.toFixed(
            2
          )}) exceeds invoice outstanding balance (R${outstanding.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Update payment allocation
    const updatedPayment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        $set: {
          invoice: invoice._id,
          allocationType: "selectedInvoice",
        },
      },
      { new: true, runValidators: true }
    ).lean();

    // Format response
    const formattedPayment = await formatPaymentResponse(updatedPayment);

    return NextResponse.json({
      success: true,
      message: "Payment allocated to invoice successfully",
      data: formattedPayment,
    });
  } catch (error: any) {
    console.error("Error allocating payment:", error);

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
        error: "Failed to allocate payment",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
