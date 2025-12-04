// models/Quote.ts
import mongoose, { Schema, Document, Types } from "mongoose";

interface IQuoteItem {
  stockItem: Types.ObjectId;
  qty: number;
  price: number;
  VATRate: number;
}

export interface IQuote extends Document {
  number: string;
  date: Date;
  client: Types.ObjectId;
  description?: string;
  quoteItems: IQuoteItem[];
  subTotal: number;
  totalDue: number;
  created_at: Date;
  updated_at: Date;

  formattedSubTotal: string;
  formattedTotalDue: string;
  vatAmount: number;
  formattedVATAmount: string;
}

const QuoteItemSchema = new Schema<IQuoteItem>(
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
      required: [true, "VAT rate is required"],
      min: [0, "VAT rate cannot be negative"],
      max: [100, "VAT rate cannot exceed 100%"],
      default: 15,
    },
  },
  { _id: false }
);

const QuoteSchema = new Schema<IQuote>(
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
    description: {
      type: String,
      trim: true,
    },
    quoteItems: [QuoteItemSchema],
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
QuoteSchema.pre("save", async function () {
  if (this.isNew) {
    const lastQuote = await mongoose.models.Quote?.findOne(
      {},
      {},
      { sort: { number: -1 } }
    );

    const lastNumber = lastQuote?.number
      ? parseInt(lastQuote.number.replace("QUO-", ""))
      : 0;

    this.number = `QUO-${(lastNumber + 1).toString().padStart(6, "0")}`;
  }

  // Calculate totals
  this.subTotal = this.quoteItems.reduce(
    (sum, item) => sum + item.qty * item.price,
    0
  );

  const vatAmount = this.quoteItems.reduce((sum, item) => {
    return sum + (item.qty * item.price * item.VATRate) / 100;
  }, 0);

  this.totalDue = this.subTotal + vatAmount;
});

// Indexes
QuoteSchema.index({ number: 1 });
QuoteSchema.index({ date: -1 });
QuoteSchema.index({ client: 1 });

// Virtual for formatted totals
QuoteSchema.virtual("formattedSubTotal").get(function (this: IQuote) {
  return this.subTotal.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

QuoteSchema.virtual("formattedTotalDue").get(function (this: IQuote) {
  return this.totalDue.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

// VAT amount virtual
QuoteSchema.virtual("vatAmount").get(function (this: IQuote) {
  return this.totalDue - this.subTotal;
});

QuoteSchema.virtual("formattedVATAmount").get(function (this: IQuote) {
  return (this.totalDue - this.subTotal).toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

export default mongoose.models.Quote ||
  mongoose.model<IQuote>("Quote", QuoteSchema);
