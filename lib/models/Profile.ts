// models/Profile.ts
import mongoose, { Schema, Document } from "mongoose";

interface IBankDetails {
  bankName: string;
  accNumber: string;
  branchCode: string;
}

interface IMessages {
  message1?: string;
  message2?: string;
  message3?: string;
}

export interface IProfile extends Document {
  companyName: string;
  email: string;
  phone: string;
  VATNo?: string;
  regNo?: string;
  address?: string;
  logo?: string;
  VATBankDetails?: IBankDetails;
  nonVATBankDetails?: IBankDetails;
  showLogoOnDocuments: boolean;
  messages?: IMessages;
  created_at: Date;
  updated_at: Date;
}

const BankDetailsSchema = new Schema<IBankDetails>(
  {
    bankName: {
      type: String,
      required: [true, "Bank name is required"],
      trim: true,
    },
    accNumber: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
    },
    branchCode: {
      type: String,
      required: [true, "Branch code is required"],
      trim: true,
    },
  },
  { _id: false }
);

const MessagesSchema = new Schema<IMessages>(
  {
    message1: {
      type: String,
      trim: true,
    },
    message2: {
      type: String,
      trim: true,
    },
    message3: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const ProfileSchema = new Schema<IProfile>(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
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
    address: {
      type: String,
      trim: true,
    },
    logo: {
      type: String, // base64 string
    },
    VATBankDetails: {
      type: BankDetailsSchema,
    },
    nonVATBankDetails: {
      type: BankDetailsSchema,
    },
    showLogoOnDocuments: {
      type: Boolean,
      default: true,
    },
    messages: {
      type: MessagesSchema,
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

// Ensure only one profile document exists
ProfileSchema.pre("save", async function () {
  if (this.isNew) {
    const count = await mongoose.models.Profile?.countDocuments();
    if (count > 0) {
      throw new Error("Only one profile document is allowed");
    }
  }
});

// Virtual for formatted bank details
ProfileSchema.virtual("formattedVATBankDetails").get(function (this: IProfile) {
  if (!this.VATBankDetails) return "";
  const { bankName, accNumber, branchCode } = this.VATBankDetails;
  return `${bankName}\nAcc: ${accNumber}\nBranch: ${branchCode}`;
});

ProfileSchema.virtual("formattedNonVATBankDetails").get(function (
  this: IProfile
) {
  if (!this.nonVATBankDetails) return "";
  const { bankName, accNumber, branchCode } = this.nonVATBankDetails;
  return `${bankName}\nAcc: ${accNumber}\nBranch: ${branchCode}`;
});

export default mongoose.models.Profile ||
  mongoose.model<IProfile>("Profile", ProfileSchema);
