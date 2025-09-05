const PrivacyPolicy = require("../models/privacyPolicyModel");

// Create new privacy policy
exports.createPrivacyPolicy = async (req, res) => {
  try {
    const { title, content, version, isActive, createdBy } = req.body;

    if (isActive) {
      await PrivacyPolicy.updateMany({ isActive: true }, { isActive: false });
    }

    const newPolicy = new PrivacyPolicy({
      title,
      content,
      version,
      isActive,
      createdBy,
    });
    await newPolicy.save();

    res
      .status(201)
      .json({
        message: "Privacy policy created successfully",
        policy: newPolicy,
      });
  } catch (error) {
    console.error("Error creating privacy policy:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update privacy policy
exports.updatePrivacyPolicy = async (req, res) => {
  try {
    const { id, title, content, version, isActive } = req.body;
    const policy = await PrivacyPolicy.findById(id);

    if (!policy) {
      return res.status(404).json({ message: "Privacy policy not found" });
    }

    if (isActive && !policy.isActive) {
      await PrivacyPolicy.updateMany({ isActive: true }, { isActive: false });
    }

    policy.title = title || policy.title;
    policy.content = content || policy.content;
    policy.version = version || policy.version;
    policy.isActive = isActive !== undefined ? isActive : policy.isActive;

    await policy.save();

    res
      .status(200)
      .json({ message: "Privacy policy updated successfully", policy });
  } catch (error) {
    console.error("Error updating privacy policy:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete privacy policy
exports.deletePrivacyPolicy = async (req, res) => {
  try {
    const { id } = req.body;
    const policy = await PrivacyPolicy.findById(id);

    if (!policy) {
      return res.status(404).json({ message: "Privacy policy not found" });
    }

    await policy.remove();
    res.status(200).json({ message: "Privacy policy deleted successfully" });
  } catch (error) {
    console.error("Error deleting privacy policy:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all privacy policies
exports.getAllPrivacyPolicies = async (req, res) => {
  try {
    const policies = await PrivacyPolicy.find().sort({ createdAt: -1 }).populate('createdBy', 'name email');
    res.status(200).json(policies);
  } catch (error) {
    console.error("Error fetching privacy policies:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get active privacy policy
exports.getActivePrivacyPolicy = async (req, res) => {
  try {
    const activePolicy = await PrivacyPolicy.findOne({ isActive: true });
    if (!activePolicy) {
      return res
        .status(404)
        .json({ message: "No active privacy policy found" });
    }
    res.status(200).json(activePolicy);
  } catch (error) {
    console.error("Error fetching active privacy policy:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get privacy policy by ID
exports.getPrivacyPolicyById = async (req, res) => {
  try {
    const { id } = req.query;
    const policy = await PrivacyPolicy.findById(id);

    if (!policy) {
      return res.status(404).json({ message: "Privacy policy not found" });
    }
    res.status(200).json(policy);
  } catch (error) {
    console.error("Error fetching privacy policy by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};
