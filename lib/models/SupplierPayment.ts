// models/SupplierPayment.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISupplierPayment extends Document {
  date: Date;
  supplier: Types.ObjectId;
  amountPaid: number;
  method: "EFT" | "Cash";
  reference: string;
  created_at: Date;
  updated_at: Date;
}

const SupplierPaymentSchema = new Schema<ISupplierPayment>(
  {
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
    amountPaid: {
      type: Number,
      required: [true, "Amount paid is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    method: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["EFT", "Cash"],
    },
    reference: {
      type: String,
      required: [true, "Reference is required"],
      trim: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

SupplierPaymentSchema.index({ date: -1 });
SupplierPaymentSchema.index({ supplier: 1 });
SupplierPaymentSchema.index({ reference: 1 });

SupplierPaymentSchema.virtual("formattedAmount").get(function (
  this: ISupplierPayment
) {
  return this.amountPaid.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

export default mongoose.models.SupplierPayment ||
  mongoose.model<ISupplierPayment>("SupplierPayment", SupplierPaymentSchema);
