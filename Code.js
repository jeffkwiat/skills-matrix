const EMAIL_COL = 45;
const MAXIMUM_RESULTS = 3;

var actions = {
  "find": {
    "requiredArgsCount": 1,
    "helpText": [{ "text": "Type `/skills find [skill]` to find a list of employees with that provided skill" }],
    "args": {
      0: [/\w+/, "Oops. It appears you did not supply a skill."]
    },
    "execute": findEmployees
  },
  "help": {
    "requiredArgsCount": 0,
    "helpText": [{ "text": "Type `/skills help` to get a list of all valid commands" }],
    "args": {},
    "execute": getHelp
  },
  "list": {
    "requiredArgsCount": 0,
    "helpText": [{ "text": "Type `/skills list` to get a list of all skills we are tracking" }],
    "args": {},
    "execute": listSkills
  }
};

var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
var range = sheet.getDataRange();
var values = range.getValues();

/**
 *  Provides the details for how to use this command.
 */
function getHelp() {
  var text = `
  *NAME:*
    /skills

  *MAINTAINER:*
    Jeff Kwiat jeffrey.kwiat@datadoghq.com

  *DESCRIPTION:*
    The Skills Matrix allows users to identify Datadog employees who have a particular skillset.

    It offers the following options:

  * \`find [skill]\`: find a list of employees with the provided skill
  * \`help\`: returns a list of all valid commands
  * \`list\`: list all skills currently being tracked\n`;
  return text;
}

function doPost(e){

  var req = null;

  try {
    req = queryStringToJSON(e.postData.contents);

    /* Extract the action from the request text */
    var action = getAction(req);
    if (!actionIsValid(action)) throw "Hi. You sent an invalid command";

    /* Extract the action arguments from the request text */
    var args = getActionArgs(req);
    args.forEach(function(arg, index) {
      if (!actionParamIsValid(arg, index, action)){
        throw actions[action].args[index][1];
      }
    });

    /* The result of the handler for any action is assigned to resText */
    var resText = actions[action].execute(args);

    /* The response is composed and sent here */
    var res = composeResponse(resText);
    return quickResponse(res);

  } catch (error) {
    Logger.log("New Error: " + error + " from " + e.postData.contents);
    if (!req || !req["text"]) {
      return quickResponse(composeResponse("Hey! You called me", actions.find.helpText));
    }
    var errorMessage = composeResponse(error, actions.find.helpText);
    return quickResponse(errorMessage);
  }
}

function getAction(req) {
  var payload = req["text"];
  var action = payload.split("+")[0];
  return action
}

function actionIsValid(action) {
  var actionList = Object.keys(actions);
  if (actionList.indexOf(action) > -1) return true;
  return false;
}

function getActionArgs(req) {
  // returns a list of arguments for the given action

  // payload should equal the command+arg1+arg2
  var payloadObjects = req["text"].split("+");
  var action = payloadObjects[0];
  var args = [];

  // if there are args, grab them
  if (actions[action].requiredArgsCount > 0) {
    args = payloadObjects[1].split("+", actions[action].requiredArgsCount);
  }

  return args;
}

function actionParamIsValid(param, paramIndex, action) {
  var pattern = actions[action].args[paramIndex][0];
  return pattern.test(param);
}

function composeResponse(text, attachments) {
  var res = {
    "response_type": "ephemeral",
    "text": text,
    "attachments": attachments || []
  };
  return res;
}

function cleanSkill(skill) {
  return skill.toLowerCase();
}

function isAdditionalColumn(column) {
  var row = 0;
  return values[row][column].toString().toLowerCase().indexOf("additional") > -1;
}

function getSkills(values, includeAdditional=true) {
  /** Return a list of all tracked skills **/
  var row = 0;
  var skills = [];
  var ignoreValues = ["timestamp", "email"];

  for (var column = 0; column < values[row].length; column++) {
    // If we do not want to include the "Additional Info" fields, and this
    // is an "Additional Info" field, skip it.
    if ((!includeAdditional) && (isAdditionalColumn(column))) {
      continue;
    }

    if (ignoreValues.includes(values[row][column].toString().toLowerCase())) {
      continue;
    }
    skills.push(values[row][column].toString());
  }
  return skills;
}

function getSkillColumn(values, skill) {
  /** Return the column for the search-for skill **/
  var row = 0;
  for (var column = 0; column < values[row].length; column++) {
    if (values[row][column].toString().toLowerCase().indexOf(skill) > -1) {
      return column;
    }
  }
  throw "Sorry, we are not currently tracking " + skill + ". Perhaps it goes by another name? :man-shrugging:";
}


function getAdditionalInfoColumn(values, skill) {
  /** Return the Additional Info column, if one exists **/
  var headerRowIndex = 0;

  for (var column = 0; column < values[headerRowIndex].length; column++) {
    if ((values[headerRowIndex][column].toString().toLowerCase().indexOf(skill) > -1) &&
       (values[headerRowIndex][column].toString().toLowerCase().indexOf("additional") > -1)) {
      return column;
    }
  }
  return -1;
}

function listSkills(args) {
  var skills = getSkills(values, false);

  // sort skills alphabetically
  return skills.sort().join("\n");
}

function getRandomEmployees(employees, numResults) {
  var randomEmployees = [];
  var randomNumber = 0;

  while (randomEmployees.length < numResults)
  {
    randomNumber = Math.floor(Math.random() * employees.length);

    if (randomEmployees.includes(employees[randomNumber])) {
      continue;
    }
    randomEmployees.push(employees[randomNumber]);
  }
  return randomEmployees;
}

function sortByEmailAddress(a, b) {
  /** Sort two employees in order of their email address **/
  if (a.email < b.email) {
    return -1;
  }
  if (a.email > b.email) {
    return 1;
  }
  return 0;
}

function findEmployees(args) {

  // This represents ALL the data
  // var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  // var range = sheet.getDataRange();
  // var values = range.getValues();

  var skill = cleanSkill(args[0]);
  var skillColumn = getSkillColumn(values, skill);
  var additionalInfoColumn = getAdditionalInfoColumn(values, skill);

  var employees = [];
  var returnEmployees = [];

  // This logs the spreadsheet in CSV format with a trailing comma
  for (var row = 1; row < values.length; row++) {
    if (values[row][skillColumn] != "")
    {
      var employee = {
        "email": values[row][EMAIL_COL],
        "level": values[row][skillColumn],
        "additional": ""
      }

      if (additionalInfoColumn > -1) {
        employee["additional"] = values[row][additionalInfoColumn].toString();
      }

      employees.push(employee);
    }
  }

  returnEmployees = getRandomEmployees(employees, MAXIMUM_RESULTS);
  return getResultString(returnEmployees, skill);

}

function getResultString(employees, skill) {
  var resultString = "";

  // Sort employees by Email Address
  employees.sort(sortByEmailAddress);

  // We were unable to find any employees with this skill
  if (!employees) {
    throw "Hey!  It looks like no one has that skill :man-shrugging:";
  }

  resultString = "The following employees are familiar with *" + skill + "*\n\n";
  for (var employeeIndex = 0; employeeIndex < employees.length; employeeIndex++)
  {
    resultString += employees[employeeIndex].email + " is *" + getLevelDescription(employees[employeeIndex].level) + "*\n";
    if (employees[employeeIndex].additional != "") {
      resultString += "Additional Info: " + employees[employeeIndex].additional + "\n";
    }
  }

  return resultString;
}

function getLevelDescription(level) {
  var levels = {"1": "Competent",
                "2": "Proficient",
                "3": "Expert"};
  return levels[level];
}

function getOutputString(employeeList, label) {
  output = "";
  output += "*" + label + "*\n---------------------\n";
  if (employeeList.length > 0) {
    output += employeeList.join("\n");
    output += "\n\n";
  } else {
    output += "No " + label + " employees found.";
    output += "\n\n";
  }

  return output;
}


function quickResponse(res) {
  var resString = JSON.stringify(res);
  var JSONOutput = ContentService.createTextOutput(resString);
  JSONOutput.setMimeType(ContentService.MimeType.JSON);
  return JSONOutput;
}

function queryStringToJSON (queryString) {
  if (!(queryString.indexOf("=") > -1)) return {};
  var queryStr = queryString.split("&");
  var queryJSON = {};
  queryStr.forEach(function(keyValue) {
    var keyValArr = keyValue.split("=");
    queryJSON[keyValArr[0]] = decodeURIComponent(keyValArr[1] || "");
  });
  return queryJSON;
}