// models/Fuel.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IFuel extends Document {
  date: Date;
  vehicle: string;
  currentMileage: number;
  kmUsedSinceLastFill: number;
  litresFilled: number;
  randValue: number;
  garageName: string;
  created_at: Date;
  updated_at: Date;
}

const FuelSchema = new Schema<IFuel>(
  {
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    vehicle: {
      type: String,
      required: [true, "Vehicle is required"],
      trim: true,
    },
    currentMileage: {
      type: Number,
      required: [true, "Current mileage is required"],
      min: [0, "Mileage cannot be negative"],
    },
    kmUsedSinceLastFill: {
      type: Number,
      required: [true, "Kilometers used is required"],
      min: [0, "Kilometers cannot be negative"],
    },
    litresFilled: {
      type: Number,
      required: [true, "Litres filled is required"],
      min: [0.01, "Litres must be greater than 0"],
    },
    randValue: {
      type: Number,
      required: [true, "Rand value is required"],
      min: [0.01, "Rand value must be greater than 0"],
    },
    garageName: {
      type: String,
      required: [true, "Garage name is required"],
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

FuelSchema.index({ date: -1 });
FuelSchema.index({ vehicle: 1 });
FuelSchema.index({ garageName: 1 });

// Virtual for cost per litre
FuelSchema.virtual("costPerLitre").get(function (this: IFuel) {
  return this.litresFilled > 0 ? this.randValue / this.litresFilled : 0;
});

// Virtual for fuel consumption (km per litre)
FuelSchema.virtual("kmPerLitre").get(function (this: IFuel) {
  return this.litresFilled > 0
    ? this.kmUsedSinceLastFill / this.litresFilled
    : 0;
});

// Virtual for cost per km
FuelSchema.virtual("costPerKm").get(function (this: IFuel) {
  return this.kmUsedSinceLastFill > 0
    ? this.randValue / this.kmUsedSinceLastFill
    : 0;
});

// Virtual for formatted values
FuelSchema.virtual("formattedRandValue").get(function (this: IFuel) {
  return this.randValue.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

FuelSchema.virtual("formattedCostPerLitre").get(function (this: IFuel) {
  const cost = this.litresFilled > 0 ? this.randValue / this.litresFilled : 0;
  return cost.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  });
});

export default mongoose.models.Fuel ||
  mongoose.model<IFuel>("Fuel", FuelSchema);
