// Enable support for Express apps.
const express = require("express");
const router = express.Router();
const app = require("../server.js");

const renderer = require("../src/renderer.js");

// Wrap the campaign request in an async function.
const home = async function (req, res) {
  // Notify the server admin that a campaign has been requested.
  req.app.debug.server("Home page requested from " + req.ip);

  // Redirect to campaign creation page if no campaign was created
  const homeRedirect = process.env.FLIPSTARTER_API_REDIRECT_HOME_URL || "/create"
  res.redirect(app.freshInstall ? "/create" : homeRedirect);

  // Notify the server admin that a campaign has been requested.
  req.app.debug.server("Home page delivered to " + req.ip);
};

// Call home when this route is requested.
router.get("/", home);

module.exports = router;
