const generateSlug = (title) => {
  const uniqueId = Date.now().toString().slice(-5);

  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\u0900-\u097F-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() 
    + `-${uniqueId}`;
};

module.exports = {
    generateSlug
}