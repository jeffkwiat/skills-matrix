# Skills Matrix

[![Git](https://app.soluble.cloud/api/v1/public/badges/132a2f19-9ab8-467f-9fe6-7a4c05f81ad3.svg?orgId=498499820349)](https://app.soluble.cloud/repos/details/github.com/jeffkwiat/skills-matrix?orgId=498499820349)  

## Description
The Skills Matrix allows users to identify Datadog employees who have a particular skillset.

It makes a call out to a Google Sheet script, which parses the arguments, searches the spreadsheet for the given skill, and returns a list of employee email addresses back to Slack.

You can access it from the Datadog workspace with the following command:

`/skills`

It offers the following options:
 
 * `find [skill]`: find a list of employees with the provided skill
 * `help`: returns a list of all valid commands
 * `list`: list all skills currently being tracked