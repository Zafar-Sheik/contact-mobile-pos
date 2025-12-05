// lib/models/GRV.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IGRVItem {
  stockItem: mongoose.Types.ObjectId;
  qty: number;
  costPrice: number;
  sellPrice: number;
}

export interface IGRV extends Document {
  GRVReference: string;
  supplier: mongoose.Types.ObjectId;
  date: Date;
  orderNumber?: string;
  notes?: string;
  pdf?: string;
  itemsReceived: IGRVItem[];
  totalQty: number;
  totalCost: number;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const GRVSchema = new Schema<IGRV>(
  {
    GRVReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    orderNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    pdf: {
      type: String,
    },
    itemsReceived: [
      {
        stockItem: {
          type: Schema.Types.ObjectId,
          ref: "StockItem",
          required: true,
        },
        qty: {
          type: Number,
          required: true,
          min: 1,
        },
        costPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        sellPrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalQty: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    totalValue: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes
GRVSchema.index({ GRVReference: 1 });
GRVSchema.index({ supplier: 1 });
GRVSchema.index({ date: 1 });
GRVSchema.index({ createdAt: -1 });

export default mongoose.models.GRV || mongoose.model<IGRV>("GRV", GRVSchema);
