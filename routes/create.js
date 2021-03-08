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

  if (!app.freshInstall) {
    return res.redirect("/");
  }

  // Render HTML
  renderer.view("create.html", res);
  res.end();

  // Notify the server admin that a campaign has been requested.
  req.app.debug.server("Create page delivered to " + req.ip);
};

const writeDescription = function (languageCode, abstract, proposal) {
  fs.mkdirSync("./static/campaigns/1/" + languageCode, { recursive: true });
  // Handle descripion
  fs.writeFile(
    "./static/campaigns/1/" + languageCode + "/abstract.md",
    abstract,
    function (err) {
      if (err) {
        return console.log(err);
      }
    }
  );
  fs.writeFile(
    "./static/campaigns/1/" + languageCode + "/proposal.md",
    proposal,
    function (err) {
      if (err) {
        return console.log(err);
      }
    }
  );
};

const initCapampaign = async function (req, res) {
  try {
    //TODO God willing: Logic for what campaigns to allow.
    // ex. paid to a wallet
    // ex. webhook invoice on bitcart/btcpayserver
    // ex. recipients includes one of our addresses (or we add it anyways)
    // ex. submitted a contribution to one of our main campaigns, hosted campaigns, God willing.

    //TODO God willing: provide proof of ownership by signing with private key.
    const freshInstall = app.freshInstall

    if (!freshInstall) {

      const recipientAddresses = req.body && req.body.recipients && req.body.recipients.map(r => r.address)

      //TODO God willing: join and filter by revoked status. May want to "revoke" campaign if contribution is revoked
      if (!recipientAddresses.find(address => {
        const commitmentsByAddress = app.queries.getCommitmentsByAddress.all({ 
          address
        })

        //TODO God willing: option for only confirmed, God willing.
        return !!commitmentsByAddress.length
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

    if (freshInstall) {
      // Render a success message
      return res.redirect("/")
    }

    //TODO God willing: return address (general or specific to campaign) for contributors to send to.
    // id isn't necessary if address encapsulates it, God willing
    return res.status(200).json({ id: createCampaignResult.lastInsertRowid });
  
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
