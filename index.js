const core = require('@actions/core');
const github = require('@actions/github');
const { GoogleSpreadsheet } = require('google-spreadsheet');

(async () => {

    try {

        const spreadsheetId = core.getInput('spreadsheetId');
        const linguistInput = JSON.parse(core.getInput('linguistPayload'));
        const worksheetName = core.getInput('worksheetIndex');

        console.log(worksheetName)

        const doc = new GoogleSpreadsheet(spreadsheetId);

        await doc.useServiceAccountAuth({
            client_email: process.env.GSHEET_CLIENT_EMAIL,
            private_key: process.env.GSHEET_PRIVATE_KEY.replace(/\\n/gm, '\n')
        });

        await doc.loadInfo();
        console.log(doc.title);

        //Node12 doesn't support optional chaining :(
        const payload = github.context.payload || {}
        const commits = payload.commits || []
        const firstCommit = commits[0] || {}
        const commitName = firstCommit.message || "No commit name"

        linguistInput["Commit name"] = commitName
        linguistInput["Date"] = (new Date()).toUTCString()

        const sheet = doc.sheetsByIndex.find(element => element.title == worksheetName) || await doc.addSheet({ headerValues: Object.keys(linguistInput), title: worksheetName });
        sheet.addRow(linguistInput);

    } catch (error) {
        core.setFailed(error.message);
    }

})();