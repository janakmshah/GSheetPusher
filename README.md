# Google Sheets Pusher javascript action

This action appenda given data to a new row on a given GSheet

## Inputs

### `who-to-greet`

**Required** The name of the person to greet. Default `"World"`.

## Outputs

### `time`

The time we greeted you.

## Example usage

uses: janakmshah/GSheetPusher@master
with:
  spreadsheetId: '1CbY4b3j41AwflkKb9jRRgXRTP23SC57sIY0LYrFtIUc'
  worksheetName: 'Sheet1'
