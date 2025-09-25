import { Schema, model, Document } from "mongoose";

export interface IContactUs extends Document {
  name: string;
  email: string;
  phoneNumbers?: string[];
  address: string;
  subject: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const phoneValidator = (phones: string[]) => {
  const phoneRegex = /^\+?\d{7,15}$/; // allows optional + and 7-15 digits
  return phones.every(phone => phoneRegex.test(phone));
};

const ContactUsSchema = new Schema<IContactUs>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumbers: {
      type: [String],
      validate: {
        validator: phoneValidator,
        message: "Phone numbers must be valid and contain only digits (optional + for country code)"
      }
    },
    address: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const ContactUs = model<IContactUs>("ContactUs", ContactUsSchema);
export default ContactUs;
