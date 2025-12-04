// models/Workflow.ts
import mongoose, { Schema, Document, Types } from "mongoose";

interface IWorkflowItem {
  stockItem: Types.ObjectId;
  qty: number;
}

export interface IWorkflow extends Document {
  date: Date;
  client: Types.ObjectId;
  location: string;
  estCost: number;
  status: "Pending" | "In Progress" | "Completed" | "Invoice";
  stockItems: IWorkflowItem[];
  created_at: Date;
  updated_at: Date;
}

const WorkflowItemSchema = new Schema<IWorkflowItem>(
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
  },
  { _id: false }
);

const WorkflowSchema = new Schema<IWorkflow>(
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
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    estCost: {
      type: Number,
      required: [true, "Estimated cost is required"],
      min: [0, "Estimated cost cannot be negative"],
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: ["Pending", "In Progress", "Completed", "Invoice"],
      default: "Pending",
    },
    stockItems: [WorkflowItemSchema],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

WorkflowSchema.index({ date: -1 });
WorkflowSchema.index({ client: 1 });
WorkflowSchema.index({ status: 1 });
WorkflowSchema.index({ location: 1 });

WorkflowSchema.virtual("formattedEstCost").get(function (this: IWorkflow) {
  return this.estCost.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });
});

// Virtual for total items count
WorkflowSchema.virtual("totalItems").get(function (this: IWorkflow) {
  return this.stockItems.reduce((sum, item) => sum + item.qty, 0);
});

export default mongoose.models.Workflow ||
  mongoose.model<IWorkflow>("Workflow", WorkflowSchema);
