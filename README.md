# Google Sheets Pusher JavaScript Action

This GitHub Action appends JSON data to a row in a Google Sheet. It authenticates with a Google service account, ensures the worksheet exists, writes a header row when needed, and appends the values from your payload along with commit metadata.

## How it works

1. Builds a JWT for a Google service account and exchanges it for an access token.
2. Creates the target worksheet if it does not exist and writes a header row from your payload keys.
3. Appends a new row containing your payload values, the commit message, and the current UTC date.

## Inputs

### `linguistPayload`
**Required.** JSON string payload to push to the sheet. Example: `{ "JavaScript": "70", "TypeScript": "30" }`.

The action automatically augments the payload with `Commit name` and `Date` columns before writing.

### `spreadsheetId`
**Required.** The ID of the Google Sheets spreadsheet (the value between `/d/` and `/edit` in the URL).

### `worksheetName`
**Optional.** The worksheet name within the spreadsheet. Defaults to the branch name for the triggering event, or `default` when no branch is available.

## Required environment variables

- `GSHEET_CLIENT_EMAIL`: Service account client email with access to the spreadsheet.
- `GSHEET_PRIVATE_KEY`: Service account private key. Use a multiline secret or replace `\n` escape sequences with real newlines.

## Example workflow

```yaml
name: Push linguist data to Google Sheets

on:
  push:
    branches: [ main ]

jobs:
  upload-stats:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Example step that produces a linguist-like JSON payload
      - id: linguist
        run: |
          echo "::set-output name=data::{\"JavaScript\":\"70\",\"TypeScript\":\"30\"}" 

      - name: Append data to Google Sheet
        uses: janakmshah/GSheetPusher@master
        with:
          linguistPayload: ${{ steps.linguist.outputs.data }}
          spreadsheetId: ${{ secrets.GSHEET_SPREADSHEET_ID }}
          worksheetName: stats
        env:
          GSHEET_CLIENT_EMAIL: ${{ secrets.GSHEET_CLIENT_EMAIL }}
          GSHEET_PRIVATE_KEY: ${{ secrets.GSHEET_PRIVATE_KEY }}
```

### Tips

- Share the target spreadsheet with the service account email so it can create worksheets and append rows.
- Keep the keys in your payload consistent to preserve column order. The header row is created from the first run.
