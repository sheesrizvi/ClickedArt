const generateSlug = (title) => {
    const uniqueId = Date.now().toString().slice(-5); 
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") + `-${uniqueId}`;
  };
  
  
module.exports = {
    generateSlug
}