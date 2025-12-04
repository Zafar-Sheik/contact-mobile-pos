// models/Staff.ts
import mongoose, { Schema, Document, Types } from "mongoose";

interface IFinancialAdjustments {
  deductions: number;
  advance: number;
  loans: number;
}

export interface IStaff extends Document {
  firstName: string;
  lastName: string;
  IDNumber: string;
  address: string;
  cellNumber: string;
  paymentMethod: "Daily" | "Weekly" | "Monthly";
  financialAdjustments: IFinancialAdjustments;
  created_at: Date;
  updated_at: Date;
}

const FinancialAdjustmentsSchema = new Schema<IFinancialAdjustments>(
  {
    deductions: {
      type: Number,
      default: 0,
      min: [0, "Deductions cannot be negative"],
    },
    advance: {
      type: Number,
      default: 0,
      min: [0, "Advance cannot be negative"],
    },
    loans: {
      type: Number,
      default: 0,
      min: [0, "Loans cannot be negative"],
    },
  },
  { _id: false }
);

const StaffSchema = new Schema<IStaff>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    IDNumber: {
      type: String,
      required: [true, "ID number is required"],
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    cellNumber: {
      type: String,
      required: [true, "Cell number is required"],
      trim: true,
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["Daily", "Weekly", "Monthly"],
      default: "Monthly",
    },
    financialAdjustments: {
      type: FinancialAdjustmentsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

StaffSchema.index({ IDNumber: 1 });
StaffSchema.index({ lastName: 1, firstName: 1 });

// Virtual for full name
StaffSchema.virtual("fullName").get(function (this: IStaff) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for total adjustments
StaffSchema.virtual("totalAdjustments").get(function (this: IStaff) {
  const adj = this.financialAdjustments;
  return adj.deductions + adj.advance + adj.loans;
});

StaffSchema.virtual("formattedTotalAdjustments").get(function (this: IStaff) {
  const adj = this.financialAdjustments;
  const total = adj.deductions + adj.advance + adj.loans;
  return total.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

export default mongoose.models.Staff ||
  mongoose.model<IStaff>("Staff", StaffSchema);
