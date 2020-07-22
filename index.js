const core = require('@actions/core');
const github = require('@actions/github');
const { GoogleSpreadsheet } = require('google-spreadsheet');

(async () => {

    try {

        const spreadsheetId = core.getInput('spreadsheetId');
        const linguistInput = JSON.parse(core.getInput('linguistPayload'));
        const worksheetIndex = core.getInput('worksheetIndex');

        const doc = new GoogleSpreadsheet(spreadsheetId);

        await doc.useServiceAccountAuth({
            client_email: process.env.GSHEET_CLIENT_EMAIL,
            private_key: process.env.GSHEET_PRIVATE_KEY.replace(/\\n/gm, '\n')
        });

        await doc.loadInfo();
        console.log(doc.title);

        //Node12 doesn't support optional chaining :(
        const pushMeta = github.context.payload.push || {}
        const commits = pushMeta.commits || []
        const firstCommit = commits[0] || {}
        const commitName = firstCommit.message || "No commit name"

        linguistInput["Commit name"] = commitName
        linguistInput["Date"] = (new Date()).toUTCString()

        const sheet = doc.sheetsByIndex[worksheetIndex];
        sheet.addRow(linguistInput);

        // Get the GitHub webhook payload for the GitHub event that triggered the workflow
        // const payload = JSON.stringify(github.context.payload, undefined, 2)
        // console.log(`The event payload: ${payload}`);

    } catch (error) {
        core.setFailed(error.message);
    }

})();