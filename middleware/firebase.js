const admin = require("firebase-admin");
const serviceAccount = require("../firebase/clickedart-1b594-firebase-adminsdk-fbsvc-d2d3f9bd41.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
