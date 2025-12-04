// models/Supplier.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISupplier extends Document {
  supplierCode: string;
  name: string;
  address?: string;
  cellNo?: string;
  contraAccount?: boolean;
  created_at: Date;
  updated_at: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    supplierCode: {
      type: String,
      required: [true, "Supplier code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },
    address: {
      type: String,

      trim: true,
    },
    cellNo: {
      type: String,

      trim: true,
    },
    contraAccount: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

SupplierSchema.index({ supplierCode: 1 });
SupplierSchema.index({ name: 1 });

export default mongoose.models.Supplier ||
  mongoose.model<ISupplier>("Supplier", SupplierSchema);
