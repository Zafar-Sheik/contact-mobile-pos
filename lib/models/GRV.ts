// models/GRV.ts
import mongoose, { Schema, Document, Types } from "mongoose";

interface IGRVItem {
  stockItem: Types.ObjectId;
  qty: number;
  costPrice: number;
  sellPrice: number;
}

export interface IGRV extends Document {
  pdf?: string;
  GRVReference: string;
  orderNumber?: string;
  date: Date;
  supplier: Types.ObjectId;
  notes?: string;
  itemsReceived: IGRVItem[];
  totalQty: number;
  totalCost: number;
  totalValue: number;
  created_at: Date;
  updated_at: Date;

  formattedTotalCost: string;
  formattedTotalValue: string;
}

const GRVItemSchema = new Schema<IGRVItem>(
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
    costPrice: {
      type: Number,
      required: [true, "Cost price is required"],
      min: [0, "Cost price cannot be negative"],
    },
    sellPrice: {
      type: Number,
      required: [true, "Sell price is required"],
      min: [0, "Sell price cannot be negative"],
    },
  },
  { _id: false }
);

const GRVSchema = new Schema<IGRV>(
  {
    pdf: {
      type: String,
    },
    GRVReference: {
      type: String,
      required: [true, "GRVReference is required"], // ADD THIS
      unique: true,
      trim: true,
      uppercase: true,
    },
    orderNumber: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required"],
    },
    notes: {
      type: String,
      trim: true,
    },
    itemsReceived: [GRVItemSchema],
    totalQty: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    totalValue: {
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
GRVSchema.pre("save", async function () {
  // Calculate totals
  this.totalQty = this.itemsReceived.reduce((sum, item) => sum + item.qty, 0);

  this.totalCost = this.itemsReceived.reduce(
    (sum, item) => sum + item.qty * item.costPrice,
    0
  );

  this.totalValue = this.itemsReceived.reduce(
    (sum, item) => sum + item.qty * item.sellPrice,
    0
  );

  // Update stock only when GRV is created
  if (this.isNew) {
    for (const item of this.itemsReceived) {
      await mongoose.models.StockItem.findByIdAndUpdate(item.stockItem, {
        $inc: { qty: item.qty },
        $set: {
          "price.cost": item.costPrice,
          "price.sellingC": item.sellPrice,
        },
      });
    }
  }
});

// Indexes
GRVSchema.index({ GRVReference: 1 });
GRVSchema.index({ date: -1 });
GRVSchema.index({ supplier: 1 });
GRVSchema.index({ orderNumber: 1 });

// Virtuals
GRVSchema.virtual("formattedTotalCost").get(function (this: IGRV) {
  return this.totalCost.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

GRVSchema.virtual("formattedTotalValue").get(function (this: IGRV) {
  return this.totalValue.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

export default mongoose.models.GRV || mongoose.model<IGRV>("GRV", GRVSchema);
