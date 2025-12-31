const fs = require('fs');
const crypto = require('crypto');

const INPUT_PREFIX = 'INPUT_';
const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

const base64Url = (value) => Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const getInput = (name, { required = false } = {}) => {
  const envName = `${INPUT_PREFIX}${name.replace(/ /g, '_').toUpperCase()}`;
  const value = process.env[envName];
  if (!value && required) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  return value;
};

const readEventPayload = () => {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return {};

  try {
    const content = fs.readFileSync(eventPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('Unable to read GitHub event payload. Proceeding with an empty payload.', error);
    return {};
  }
};

const buildJwtAssertion = (clientEmail, privateKey) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  };

  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${unsignedToken}.${signature}`;
};

const fetchAccessToken = async (clientEmail, privateKey) => {
  const assertion = buildJwtAssertion(clientEmail, privateKey);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to retrieve access token (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Access token not present in authentication response.');
  }
  return data.access_token;
};

const escapeSheetTitle = (title) => `'${title.replace(/'/g, "''")}'`;

const fetchSheetMetadata = async (spreadsheetId, accessToken) => {
  const response = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load spreadsheet metadata (${response.status}): ${text}`);
  }

  return response.json();
};

const createSheetIfMissing = async (spreadsheetId, worksheetName, accessToken) => {
  const metadata = await fetchSheetMetadata(spreadsheetId, accessToken);
  const existingSheet = (metadata.sheets || []).find(
    ({ properties }) => properties?.title?.toLowerCase() === worksheetName.toLowerCase()
  );

  if (existingSheet) {
    return false;
  }

  const response = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: worksheetName } } }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create worksheet (${response.status}): ${text}`);
  }

  return true;
};

const updateHeaderRow = async (spreadsheetId, worksheetName, headers, accessToken) => {
  const headerRange = `${escapeSheetTitle(worksheetName)}!1:1`;
  const response = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: headerRange,
        majorDimension: 'ROWS',
        values: [headers]
      })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to write header row (${response.status}): ${text}`);
  }
};

const appendRow = async (spreadsheetId, worksheetName, headers, rowData, accessToken) => {
  const values = headers.map((key) => rowData[key] ?? '');
  const range = escapeSheetTitle(worksheetName);

  const response = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        range,
        values: [values]
      })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to append row (${response.status}): ${text}`);
  }
};

(async () => {
  try {
    const spreadsheetId = getInput('spreadsheetId', { required: true });
    const linguistInput = JSON.parse(getInput('linguistPayload', { required: true }));
    const eventPayload = readEventPayload();
    const branchName = (eventPayload.ref || '').replace('refs/heads/', '');
    const worksheetName = getInput('worksheetName') || branchName || 'default';

    console.log(`Using worksheet: ${worksheetName}`);

    const commits = Array.isArray(eventPayload.commits) ? eventPayload.commits : [];
    const firstCommit = commits[0] || {};
    const commitName = (firstCommit.message || 'No commit name').split('\n')[0];

    linguistInput['Commit name'] = commitName;
    linguistInput.Date = new Date().toUTCString();

    const clientEmail = process.env.GSHEET_CLIENT_EMAIL;
    const privateKey = (process.env.GSHEET_PRIVATE_KEY || '').replace(/\\n/gm, '\n');

    if (!clientEmail || !privateKey) {
      throw new Error('GSHEET_CLIENT_EMAIL and GSHEET_PRIVATE_KEY environment variables are required for authentication.');
    }

    const accessToken = await fetchAccessToken(clientEmail, privateKey);
    const headers = Object.keys(linguistInput);

    const wasCreated = await createSheetIfMissing(spreadsheetId, worksheetName, accessToken);
    if (wasCreated) {
      await updateHeaderRow(spreadsheetId, worksheetName, headers, accessToken);
    }

    await appendRow(spreadsheetId, worksheetName, headers, linguistInput, accessToken);
    console.log('Row appended successfully.');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
