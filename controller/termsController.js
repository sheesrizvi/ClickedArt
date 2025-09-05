const Terms = require("../models/termsModel");

// Create new terms
exports.createTerms = async (req, res) => {
  try {
    const { title, content, version, isActive, createdBy } = req.body;

    if (isActive) {
      await Terms.updateMany({ isActive: true }, { isActive: false });
    }
    const newTerms = new Terms({
      title,
      content,
      version,
      isActive,
      createdBy,
    });
    await newTerms.save();

    res
      .status(201)
      .json({ message: "Terms created successfully", terms: newTerms });
  } catch (error) {
    console.error("Error creating terms:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update terms
exports.updateTerms = async (req, res) => {
  try {
    const { id, title, content, version, isActive } = req.body;
    const terms = await Terms.findById(id);
    if (!terms) {
      return res.status(404).json({ message: "Terms not found" });
    }
    if (isActive && !terms.isActive) {
      await Terms.updateMany({ isActive: true }, { isActive: false });
    }
    terms.title = title || terms.title;
    terms.content = content || terms.content;
    terms.version = version || terms.version;
    terms.isActive = isActive !== undefined ? isActive : terms.isActive;
    await terms.save();

    res.status(200).json({ message: "Terms updated successfully", terms });
  } catch (error) {
    console.error("Error updating terms:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete terms
exports.deleteTerms = async (req, res) => {
  try {
    const { id } = req.body;
    const terms = await Terms.findById(id);
    if (!terms) {
      return res.status(404).json({ message: "Terms not found" });
    }
    await terms.remove();
    res.status(200).json({ message: "Terms deleted successfully" });
  } catch (error) {
    console.error("Error deleting terms:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all terms
exports.getAllTerms = async (req, res) => {
  try {
    const terms = await Terms.find().sort({ createdAt: -1 }).populate('createdBy', 'name email');
    res.status(200).json(terms);
  } catch (error) {
    console.error("Error fetching terms:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get active terms
exports.getActiveTerms = async (req, res) => {
  try {
    const activeTerms = await Terms.findOne({ isActive: true });
    if (!activeTerms) {
      return res.status(404).json({ message: "No active terms found" });
    }
    res.status(200).json(activeTerms);
  } catch (error) {
    console.error("Error fetching active terms:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get terms by ID
exports.getTermsById = async (req, res) => {
  try {
    const { id } = req.query;
    const terms = await Terms.findById(id);
    if (!terms) {
      return res.status(404).json({ message: "Terms not found" });
    }
    res.status(200).json(terms);
  } catch (error) {
    console.error("Error fetching terms by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};
