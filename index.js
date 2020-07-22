const core = require('@actions/core');
const github = require('@actions/github');

try {

    const gSheetsServiceEmail = core.getInput('gSheetsServiceEmail');
    const gSheetsServiceKey = core.getInput('gSheetsServiceKey');
    const spreadsheetId = core.getInput('spreadsheetId');
    const worksheetName = core.getInput('worksheetName');

    console.log(`Hello ${gSheetsServiceEmail}`);
    console.log(`Hello ${gSheetsServiceKey}`);
    console.log(`Hello ${spreadsheetId}`);
    console.log(`Hello ${worksheetName}`);

    const time = (new Date()).toTimeString();
    core.setOutput("time", time);

    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`Author is ${github.context.payload.sender.login}`)
    console.log(`The event payload: ${payload}`);

} catch (error) {
    core.setFailed(error.message);
}