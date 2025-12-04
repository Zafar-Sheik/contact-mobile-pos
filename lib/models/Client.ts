// models/Client.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IClient extends Document {
  customerCode: string;
  companyName: string;
  owner: string;
  address?: string;
  cellNo?: string;
  email?: string;
  VATNo?: string;
  regNo?: string;
  priceCategory?: string;
  creditLimit?: number;
  created_at: Date;
  updated_at: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    customerCode: {
      type: String,
      required: [true, "Customer code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    owner: {
      type: String,
      required: [true, "Owner name is required"],
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
    email: {
      type: String,

      lowercase: true,
      trim: true,
    },
    VATNo: {
      type: String,
      trim: true,
    },
    regNo: {
      type: String,
      trim: true,
    },
    priceCategory: {
      type: String,

      enum: ["A", "B", "C", "D", "E"],
      default: "C",
    },
    creditLimit: {
      type: Number,
      min: [0, "Credit limit cannot be negative"],
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

ClientSchema.index({ customerCode: 1 });
ClientSchema.index({ companyName: 1 });
ClientSchema.index({ email: 1 });

export default mongoose.models.Client ||
  mongoose.model<IClient>("Client", ClientSchema);
