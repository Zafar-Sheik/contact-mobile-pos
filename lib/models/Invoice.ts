// models/Invoice.ts
import mongoose, { Schema, Document, Types } from "mongoose";

interface IInvoiceItem {
  stockItem: Types.ObjectId;
  qty: number;
  price: number;
  VATRate?: number;
}

export interface IInvoice extends Document {
  number: string;
  date: Date;
  client: Types.ObjectId;
  type: "VAT" | "non VAT";
  description?: string;
  items: IInvoiceItem[];
  totalQty: number;
  subTotal: number;
  totalDue: number;
  created_at: Date;
  updated_at: Date;

  formattedSubTotal: string;
  formattedTotalDue: string;
  vatAmount: number;
  formattedVATAmount: string;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    stockItem: {
      type: Schema.Types.ObjectId,
      ref: "StockItem",
      required: [true, "Stock item is required"],
    },
    qty: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    VATRate: {
      type: Number,
      min: [0, "VAT rate cannot be negative"],
      max: [100, "VAT rate cannot exceed 100%"],
    },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    number: {
      type: String,
      unique: true,
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
    },
    type: {
      type: String,
      required: [true, "Invoice type is required"],
      enum: ["VAT", "non VAT"],
      default: "VAT",
    },
    description: {
      type: String,
      trim: true,
    },
    items: [InvoiceItemSchema],
    totalQty: {
      type: Number,
      default: 0,
    },
    subTotal: {
      type: Number,
      default: 0,
    },
    totalDue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// --- FIXED PRE-SAVE MIDDLEWARE (NO next()) ---
InvoiceSchema.pre("save", async function () {
  // Generate invoice number IF new
  if (this.isNew) {
    const lastInvoice = await mongoose.models.Invoice?.findOne(
      {},
      {},
      { sort: { number: -1 } }
    );
    const lastNumber = lastInvoice?.number
      ? parseInt(lastInvoice.number.replace("INV-", ""))
      : 0;

    this.number = `INV-${(lastNumber + 1).toString().padStart(6, "0")}`;
  }

  // Totals
  this.totalQty = this.items.reduce((sum, item) => sum + item.qty, 0);

  this.subTotal = this.items.reduce(
    (sum, item) => sum + item.qty * item.price,
    0
  );

  if (this.type === "VAT") {
    const vatAmount = this.items.reduce((sum, item) => {
      const rate = item.VATRate || 15;
      return sum + (item.qty * item.price * rate) / 100;
    }, 0);

    this.totalDue = this.subTotal + vatAmount;
  } else {
    this.totalDue = this.subTotal;
  }
});

// Indexes
InvoiceSchema.index({ number: 1 });
InvoiceSchema.index({ date: -1 });
InvoiceSchema.index({ client: 1 });
InvoiceSchema.index({ type: 1 });

// Virtuals
InvoiceSchema.virtual("formattedSubTotal").get(function (this: IInvoice) {
  return this.subTotal.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

InvoiceSchema.virtual("formattedTotalDue").get(function (this: IInvoice) {
  return this.totalDue.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

InvoiceSchema.virtual("vatAmount").get(function (this: IInvoice) {
  return this.totalDue - this.subTotal;
});

InvoiceSchema.virtual("formattedVATAmount").get(function (this: IInvoice) {
  return (this.totalDue - this.subTotal).toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

export default mongoose.models.Invoice ||
  mongoose.model<IInvoice>("Invoice", InvoiceSchema);
