// Enable support for Express apps.
const express = require("express");
const router = express.Router();
const app = require("../server.js");
const moment = require("moment");
const fs = require("fs");

const renderer = require("../src/renderer.js");

// Wrap the campaign request in an async function.
const create = async function (req, res) {
  // Notify the server admin that a campaign has been requested.
  req.app.debug.server("Create page requested from " + req.ip);

  let apiUrl = (process.env.FLIPSTARTER_API_URL || req.get('host')).replace(/\/$/, "")

  if (!apiUrl.match(/^(http:\/\/|https:\/\/|\/\/)/)) {
    apiUrl = "//" + apiUrl
  }
  
  let gatewayUrl = (process.env.FLIPSTARTER_IPFS_GATEWAY_URL || "https://ipfs.io").replace(/\/$/, "")

  if (!gatewayUrl.match(/^(http:\/\/|https:\/\/|\/\/)/)) {
    gatewayUrl = "//" + gatewayUrl
  }

  const redirectUrl = `${gatewayUrl}/ipfs/${process.env.FLIPSTARTER_IPFS_CREATE_CID}?api_address=${apiUrl}&api_type=https` 
  res.redirect(redirectUrl);

  // Notify the server admin that a campaign has been requested.
  req.app.debug.server("Create page delivered to " + req.ip);
};

const initCapampaign = async function (req, res) {
  try {


    const freshInstall = app.freshInstall

    if (!freshInstall && process.env.FLIPSTARTER_API_AUTH !== "no-auth") {

      const recipientAddresses = req.body && req.body.recipients && req.body.recipients.map(r => r.address)

      let filterCommitments
      
      if (process.env.FLIPSTARTER_API_AUTH == "pending-contributions") {
        filterCommitments = (c) => c.campaign_id == 1 && (!c.revocation_id || (c.fullfillment_timestamp && c.revocation_timestamp > c.fullfillment_timestamp))
      } else if (process.env.FLIPSTARTER_API_AUTH === "confirmed-contributions") {
        filterCommitments = (c) => c.campaign_id == 1 && c.fullfillment_timestamp && c.revocation_timestamp > c.fullfillment_timestamp
      }

      if (!recipientAddresses.find(address => {
        const commitmentsByAddress = app.queries.getCommitmentsByAddress.all({ address })
        return commitmentsByAddress.find(filterCommitments)
      })) {
        return res.status(403).json({ error: "No commitments found for recipient address. Access denied."})
      }
    }

    req.app.debug.server("Init campaign from " + req.ip);
    
    const campaignData = req.body
    const hasData = !!campaignData && !isNaN(Number(campaignData.starts)) && !isNaN(Number(campaignData.expires))
    const hasRecipients = hasData && campaignData.recipients && campaignData.recipients.length && campaignData.recipients.every(r => {
      //TODO God willing: validate addresses and satoshis (more than dust)
      return r.address && r.satoshis
    })

    if (!hasData || !hasRecipients) {
      throw "Invalid campaign data"
    }

    // Actually initialize the campaign with the POST data
    const getDescriptionLanguage = (code) => {
      const description = campaignData.descriptions && campaignData.descriptions[code] || {}
      return {
        abstract: description.abstract || "",
        proposal: description.proposal || ""
      }
    }

    const { abstract = "", proposal = "" } = getDescriptionLanguage("en")
    const { abstractES = "", proposalES = "" } = getDescriptionLanguage("es")
    const { abstractZH = "", proposalZH = "" } = getDescriptionLanguage("zh")
    const { abstractJA = "", proposalJA = "" } = getDescriptionLanguage("ja")

    const createCampaignResult = app.queries.addCampaign.run({
      title: campaignData.title,
      starts: Number(campaignData.starts),
      expires: Number(campaignData.expires),
      abstract,
      proposal,
      abstractJA,
      proposalJA,
      abstractES,
      proposalES,
      abstractZH,
      proposalZH
    });

    campaignData.recipients.forEach((recipient, i) => {
      const addUserResult = app.queries.addUser.run({
        user_url: recipient.url,
        user_image: recipient.image,
        user_alias: recipient.name,
        user_address: recipient.address,
        data_signature: null,
      });

      app.queries.addRecipientToCampaign.run({
        user_id: addUserResult.lastInsertRowid,
        campaign_id: createCampaignResult.lastInsertRowid,
        recipient_satoshis: recipient.satoshis
      });
    })

    // IMPORTANT: do not let the user access this page again
    // and redirect to home if they try
    app.freshInstall = false;

    let address = (process.env.FLIPSTARTER_API_URL || req.get('host')).replace(/\/$/, "")

    if (!address.match(/^(http:\/\/|https:\/\/|\/\/)/)) {
      address = "//" + address
    }

    const id = createCampaignResult.lastInsertRowid

    return res.status(200).json({ id, address });
  
  } catch (err) {
    req.app.debug.server(err)
    return res.status(400).end()
  }
};

// Call create when this route is requested.
router.get("/", create);
// Init when the form is submitted
router.post("/", initCapampaign);

module.exports = router;
