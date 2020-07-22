const core = require('@actions/core');
const github = require('@actions/github');
const { GoogleSpreadsheet } = require('google-spreadsheet');

try {

    const gSheetsServiceEmail = core.getInput('gSheetsServiceEmail');
    const gSheetsServiceKey = core.getInput('gSheetsServiceKey');
    const spreadsheetId = core.getInput('spreadsheetId');
    const worksheetName = core.getInput('worksheetName');

    //console.log(`Hello ${worksheetName}`);

    const doc = new GoogleSpreadsheet(spreadsheetId);

    await doc.useServiceAccountAuth({
        client_email: gSheetsServiceEmail, //process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: gSheetsServiceKey //process.env.GOOGLE_PRIVATE_KEY,
    });

    await doc.loadInfo();
    console.log(doc.title);

    const sheet = doc.sheetsByIndex[0];
    console.log(sheet.title);
    console.log(sheet.rowCount);
    console.log(sheet.payload)

    // const time = (new Date()).toTimeString();
    // core.setOutput("time", time);

    // Get the GitHub webhook payload for the GitHub event that triggered the workflow
    // const payload = JSON.stringify(github.context.payload, undefined, 2)
    // console.log(`Author is ${github.context.payload.sender.login}`)
    // console.log(`The event payload: ${payload}`);

} catch (error) {
    core.setFailed(error.message);
}