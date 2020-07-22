const core = require('@actions/core');
const github = require('@actions/github');
const { GoogleSpreadsheet } = require('google-spreadsheet');

(async () => {

    try {

        const spreadsheetId = core.getInput('spreadsheetId');
        const linguistInput = {"Ruby": "75.21%", "Dockerfile": "19.80%", "Shell": "5.00%"}
        const worksheetIndex = core.getInput('worksheetIndex');

        const doc = new GoogleSpreadsheet(spreadsheetId);

        await doc.useServiceAccountAuth({
            client_email: process.env.GSHEET_CLIENT_EMAIL,
            private_key: process.env.GSHEET_PRIVATE_KEY,
        });

        await doc.loadInfo();
        console.log(doc.title);

        var languagesArray = [];
        for (var language in linguistInput) {
            languagesArray.push(linguistInput[language] + " - " + language);
        }

        //Node12 doesn't support optional chaining :(
        const pushMeta = github.context.payload.push || {}
        const commits = pushMeta.commits || []
        const firstCommit = commits[0] || {}
        const commitName = firstCommit.message || "No commit name"

        languagesArray.unshift(commitName, (new Date()).toUTCString())

        console.log(languagesArray)

        const sheet = doc.sheetsByIndex[worksheetIndex];
        sheet.addRow(languagesArray);

        // Get the GitHub webhook payload for the GitHub event that triggered the workflow
        // const payload = JSON.stringify(github.context.payload, undefined, 2)
        // console.log(`The event payload: ${payload}`);

    } catch (error) {
        core.setFailed(error.message);
    }

})();