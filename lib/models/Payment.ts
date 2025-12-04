// lib/models/Payment.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPayment extends Document {
  date: Date;
  client: Types.ObjectId;
  amount: number;
  method: "EFT" | "Cash";
  allocationType: "balanceBroughtForward" | "selectedInvoice";
  invoice?: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
  formattedAmount: string;
}

const PaymentSchema = new Schema<IPayment>(
  {
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
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    method: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["EFT", "Cash"],
    },
    allocationType: {
      type: String,
      required: [true, "Allocation type is required"],
      enum: ["balanceBroughtForward", "selectedInvoice"],
    },
    invoice: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Indexes
PaymentSchema.index({ date: -1 });
PaymentSchema.index({ client: 1 });
PaymentSchema.index({ method: 1 });

// Validate invoice reference when required
PaymentSchema.pre("save", function () {
  if (this.allocationType === "selectedInvoice" && !this.invoice) {
    throw new Error(
      "Invoice reference is required for selected invoice allocation"
    );
  }
});

// Virtual: formatted currency
PaymentSchema.virtual("formattedAmount").get(function (this: IPayment) {
  return this.amount.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

export default mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", PaymentSchema);
