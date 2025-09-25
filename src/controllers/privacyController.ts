import { Request, Response } from "express";
import PrivacyPolicy from "../models/Privacy";

// Create a new privacy policy
export const createPrivacyPolicy = async (req: Request, res: Response) => {
  try {
    const { title, content, version, effectiveDate } = req.body;

    // Optional: deactivate current active policy
    await PrivacyPolicy.updateMany({ isActive: true }, { isActive: false });

    const policy = new PrivacyPolicy({
      title,
      content,
      version,
      effectiveDate,
      isActive: true,
    });

    await policy.save();
    res.status(201).json(policy);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// Update an existing policy by ID
export const updatePrivacyPolicy = async (req: Request, res: Response) => {
  try {
    const { policyId } = req.params;
    const updateData = req.body;

    const policy = await PrivacyPolicy.findByIdAndUpdate(policyId, updateData, {
      new: true,
    });

    if (!policy) return res.status(404).json({ message: "Policy not found" });

    res.status(200).json(policy);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// Get the currently active policy
export const getActivePrivacyPolicy = async (req: Request, res: Response) => {
  try {
    const policy = await PrivacyPolicy.findOne({ isActive: true });

    if (!policy)
      return res.status(404).json({ message: "No active privacy policy found" });

    res.status(200).json(policy);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// Get all policies (history)
export const getAllPrivacyPolicies = async (req: Request, res: Response) => {
  try {
    const policies = await PrivacyPolicy.find().sort({ createdAt: -1 });
    res.status(200).json(policies);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};
