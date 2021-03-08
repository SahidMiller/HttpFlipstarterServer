/* eslint-disable */
const SATS_PER_BCH = 100000000;

function addRecipient() {
  const maxRecipients = 6;
  const index = $('#recipients .recipient').length

  if (index < maxRecipients) {
    $("#recipients").append(
      `<div class="recipient">
        <p class="${ index !== 0 ? 'd-inline' : '' }">Recipient ${index + 1}</p>
        ${ index !== 0 ? '<div class="remove btn btn-link text-danger d-inline float-right">Remove</div>' : '' }
        <div class="form-row text-muted">
          <div class="form-group col-lg-4">
            <label for="amount[${index}]">Funding Goal <small>(amount in BCH)</small></label>
            <input type="number" class="form-control goal-input" id="amount[${index}]" name="amount[${index}]" step="0.00000001" min="0.00000546" required>
          </div>
          <div class="form-group col-lg-4">
            <label for="image_url[${index}]">Image URL</label>
            <input type="text" class="form-control check-url" id="image_url[${index}]" name="image_url[${index}]" required>
          </div>
          <div class="form-group col-lg-4">
            <label for="recipient_name[${index}]">Recipient Name</label>
            <input type="text" class="form-control" id="recipient_name[${index}]" name="recipient_name[${index}]" required>
          </div>
        </div>
        <div class="form-row text-muted">
          <div class="form-group col-md-6">
            <label for="bch_address[${index}]">Bitcoin Cash Address <small>(include bitcoincash: prefix)</small></label>
            <input type="text" class="form-control check-bch-address" id="bch_address[${index}]" name="bch_address[${index}]" required>
          </div>
          <div class="form-group col-md-6">
            <label for="project_url[${index}]">Recipient Website</label>
            <input type="text" class="form-control check-url" id="project_url[${index}]" name="project_url[${index}]" required>
          </div>
        </div>
      </div>`
    );
  } else {
    $(".js-add-recipient").hide();
  }
}

// Remove recipient
$("#recipients").on("click", ".remove", function() {
  $(this).parent("div").remove();
  index--;
});

// Prevent letters in date inputs
$(".date-input").on("keypress", function(evt) {
  if (evt.which < 48 || evt.which > 57) {
    evt.preventDefault();
  }
});

// Allow only numbers and dot in goal input
$("#form").on("click", ".goal-input", function() {
  var elem = $(this)
  elem.val(Number(elem.val()).toFixed(8));
}) 

$("#form").on("keydown", ".goal-input", function(e) {
  if (e.which === 38 || e.which === 40) {
    var elem = $(this)
    elem.val(Number(elem.val()).toFixed(8));
  }
})   

$("#form").on("click", "#create", async function(event) {
  event.preventDefault()

  if (!validateForm()) {
    return
  }

  let createBtn = $("#create")
  let errorBox = $("#error")
  let buttonTxt = createBtn.text()

  try {

    createBtn.prop('disabled', true)
    errorBox.addClass("d-none")

    const formValues = Qs.parse($("form").serialize(), { arrayFormat: 'index' })

    // Convert date to EPOCH
    const start_year = formValues.start_year;
    const start_month = formValues.start_month;
    const start_day = formValues.start_day;
    const start_date = moment(start_year + "-" + start_month + "-" + start_day, "YYYY-MM-DD").unix()

    const end_year = formValues.end_year;
    const end_month = formValues.end_month;
    const end_day = formValues.end_day;
    const end_date = moment(end_year + "-" + end_month + "-" + end_day, "YYYY-MM-DD").unix()

    const recipients = formValues.recipient_name.map((_, i) => {
      return {
        name: formValues.recipient_name[i],
        url: formValues.project_url[i],
        image: formValues.image_url[i],
        alias: formValues.recipient_name[i],
        address: formValues.bch_address[i],
        signature: null,
        satoshis: Number(formValues.amount[i]) * SATS_PER_BCH // to satoshis
      }
    })

    const campaign = {
      title: formValues.title,
      starts: Number(start_date),
      expires: Number(end_date),
      recipients,
      contributions: [],
      fullfilled: false,
      fullfillmentTx: null,
      fullfillmentTimestamp: null,
      descriptions: {
        "en": { abstract: formValues.abstract, proposal: formValues.proposal },
        "es": { abstract: formValues.abstractES, proposal: formValues.proposalES },
        "zh": { abstract: formValues.abstractZH, proposal: formValues.proposalZH },
        "ja": { abstract: formValues.abstractJA, proposal: formValues.proposalJA }
      }
    }

    let response

    try {
      
      response = await fetch("/create", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaign)
      })

    } catch (error) {
      throw "Failed to create flipstarter with remote server"
    }

    if (response.status !== 200) {
      throw "Invalid response from remote server"
    }

    try {
      
      const { id, address = formValues.api_address } = await response.json()
      campaign.id = id
      campaign.address = address
      whind
    } catch {
      throw "Invalid response from remote server"
    }

  } catch (error) {

    errorBox.removeClass("d-none")
    errorBox.text(typeof(error) === 'string' ? error : "Something went wrong. Try again.")
    createBtn.text(buttonTxt)
    createBtn.prop('disabled', false)
  }
})

// Check if URL is valid
function validateURL(textval) {
  // regex modified from https://github.com/jquery-validation/jquery-validation/blob/c1db10a34c0847c28a5bd30e3ee1117e137ca834/src/core.js#L1349
  var urlregex = /^(?:(?:(?:https?):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;
  return urlregex.test(textval);
}

function checkValidity(elem) {
  return elem[0].checkValidity()
}

// Validate form before submitting
function validateForm() {
  var formValid =  checkValidity($('form'))
  $('.form-control').removeClass('border-danger text-danger');

  $('.form-control').each(function() {
    let inputValid = checkValidity($(this))
    if ( ($(this).prop('required') && ($(this).val().length == 0 || $(this).val() == " ")) // test for blank while required
      || ($(this).hasClass('check-url') && !validateURL($(this).val())) // test for check URL
    ) {
      inputValid = false;
      formValid = false;
    }

    // Test for BCH address
    if ($(this).hasClass('check-bch-address')) {
      if (bchaddr.isValidAddress($(this).val())) {
        if (bchaddr.isLegacyAddress($(this).val())) {
          // isLegacyAddress throws an error if it is not given a valid BCH address
          // this explains the nested if
          inputValid = false;
          formValid = false;
        }
      } else {
        inputValid = false;
        formValid = false;
      }
    }

    let showError = $(this).parent().find(".show-error-on-validation")

    // After all validation
    if (!inputValid) {
      
      $(this).addClass('border-danger text-danger');
      
      if (showError.length) {
        showError.removeClass("d-none")
      }

    } else {
      if (showError.length) {
        showError.addClass("d-none")
      }
    }
  });

  // Submit if everything is valid
  if (formValid) {
    return true
  } else {
    $("#error").removeClass("d-none");
    $("#error").text("Some fields are incorrect.")
    return false
  }
}

function getDateParts(unixDate) {
  const momentDate = moment.unix(unixDate)

  return {
    year: momentDate.format('YYYY'),
    month: momentDate.month(),
    day: momentDate.format('D')
  }
}

const startDate = getDateParts(moment().unix())
const endDate = getDateParts(moment().add(1, 'days').unix())

$("#start_year").val(startDate.year)
$("#start_month > option").eq(startDate.month).prop('selected', true)
$("#start_day").val(startDate.day)

$("#end_year").val(endDate.year)
$("#end_month > option").eq(endDate.month).prop('selected', true)
$("#end_day").val(endDate.day)