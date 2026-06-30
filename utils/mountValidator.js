/**
 * Backend Mount validator utility
 * Mirror of frontend's mountUtils validation logic to ensure single source of truth
 */

const getAvailableMounts = (width, height, allMounts = []) => {
  if (!width || !height) return [];

  const w = parseFloat(width);
  const h = parseFloat(height);

  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);

  let maxAllowedThickness = 0;

  if (minDim <= 27 && maxDim <= 37) {
    maxAllowedThickness = Infinity; // All mounts allowed
  } else if (minDim <= 28 && maxDim <= 38) {
    maxAllowedThickness = 1.5; // Up to 1.5"
  } else if (minDim <= 29 && maxDim <= 39) {
    maxAllowedThickness = 1.0; // Up to 1.0"
  } else {
    maxAllowedThickness = 0; // No mounts allowed
  }

  if (maxAllowedThickness === 0) {
    return [];
  }

  if (allMounts && allMounts.length > 0) {
    // Collect all unique active thicknesses from allMounts that are <= maxAllowedThickness
    const thicknesses = allMounts
      .filter((m) => m && m.thickness !== undefined && parseFloat(m.thickness) <= maxAllowedThickness)
      .map((m) => String(m.thickness));
    // Deduplicate
    return Array.from(new Set(thicknesses));
  }

  // Fallback defaults
  const defaults = ["1", "1.5", "2"];
  return defaults.filter((val) => parseFloat(val) <= maxAllowedThickness);
};

const getAllowedMountOptions = (width, height, allMounts = []) => {
  const available = getAvailableMounts(width, height, allMounts);
  return ["0", ...available];
};

const isMountSizeAllowed = (mountSize, width, height, allMounts = []) => {
  if (String(mountSize) === "0" || String(mountSize) === "none") return true;
  const available = getAvailableMounts(width, height, allMounts);
  return available.includes(String(mountSize));
};

module.exports = {
  getAvailableMounts,
  getAllowedMountOptions,
  isMountSizeAllowed
};
