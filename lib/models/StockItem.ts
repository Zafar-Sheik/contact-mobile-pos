// models/StockItem.ts
import mongoose, { Schema, Document, Types } from "mongoose";

interface IPriceCategory {
  sellingA?: number;
  sellingB?: number;
  sellingD?: number;
  sellingE?: number;
}

interface IPrice {
  cost: number;
  sellingC: number;
  VAT: number;
}

interface IStockLevel {
  minStockLevel: number;
  maxStockLevel: number;
}

export interface IStockItem extends Document {
  code: string;
  name: string;
  qty: number;
  category?: string;
  description?: string;
  dimensions?: string[];
  supplier?: Types.ObjectId;
  price: IPrice;
  priceCategory?: IPriceCategory;
  stockLevel: IStockLevel;
  isActive: boolean;
  image?: string;
  created_at: Date;
  updated_at: Date;
}

const StockItemSchema = new Schema<IStockItem>(
  {
    code: {
      type: String,
      required: [true, "Stock code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Stock name is required"],
      trim: true,
    },
    qty: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    category: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dimensions: [
      {
        type: String,
        trim: true,
      },
    ],
    supplier: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
    },
    price: {
      cost: {
        type: Number,
        required: [true, "Cost price is required"],
        min: [0, "Cost price cannot be negative"],
      },
      sellingC: {
        type: Number,
        required: [true, "Selling price C is required"],
        min: [0, "Selling price cannot be negative"],
      },
      VAT: {
        type: Number,
        required: [true, "VAT rate is required"],
        min: [0, "VAT rate cannot be negative"],
        max: [100, "VAT rate cannot exceed 100%"],
        default: 15,
      },
    },
    priceCategory: {
      sellingA: {
        type: Number,
        min: [0, "Price cannot be negative"],
      },
      sellingB: {
        type: Number,
        min: [0, "Price cannot be negative"],
      },
      sellingD: {
        type: Number,
        min: [0, "Price cannot be negative"],
      },
      sellingE: {
        type: Number,
        min: [0, "Price cannot be negative"],
      },
    },
    stockLevel: {
      minStockLevel: {
        type: Number,
        required: [true, "Minimum stock level is required"],
        min: [0, "Minimum stock level cannot be negative"],
        default: 0,
      },
      maxStockLevel: {
        type: Number,
        required: [true, "Maximum stock level is required"],
        min: [0, "Maximum stock level cannot be negative"],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String, // base64 string
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

StockItemSchema.index({ code: 1 });
StockItemSchema.index({ name: 1 });
StockItemSchema.index({ category: 1 });
StockItemSchema.index({ isActive: 1 });

// Virtual for current stock status
StockItemSchema.virtual("stockStatus").get(function (this: IStockItem) {
  if (this.qty <= this.stockLevel.minStockLevel) return "Low";
  if (this.qty >= this.stockLevel.maxStockLevel) return "High";
  return "Normal";
});

// Virtual for formatted cost price
StockItemSchema.virtual("formattedCost").get(function (this: IStockItem) {
  return this.price.cost.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

// Virtual for formatted selling price C
StockItemSchema.virtual("formattedSellingC").get(function (this: IStockItem) {
  return this.price.sellingC.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

export default mongoose.models.StockItem ||
  mongoose.model<IStockItem>("StockItem", StockItemSchema);
