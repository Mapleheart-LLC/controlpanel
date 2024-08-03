const express = require('express');
const https = require('https');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(express.static('.'));
app.use(express.json());

function getAuthKey() {
    try {
        const text = fs.readFileSync('authkey', 'utf-8');
        const lines = text.split('\n');
        const devTokenLine = lines.find(line => line.startsWith('devToken='));
        const mainTokenLine = lines.find(line => line.startsWith('mainToken='));

        const devToken = devTokenLine ? devTokenLine.split('=')[1].trim() : null;
        const mainToken = mainTokenLine ? mainTokenLine.split('=')[1].trim() : null;

        if (!devToken) {
            throw new Error('Missing dev token in authkey file');
        }
        if (!mainToken) {
            throw new Error('Missing Main Token in authkey')
        }

        return { devToken, mainToken };
    } catch (error) {
        console.error('Error reading authkey file:', error);
        throw error;
    }
}

function updateMainToken(newMainToken) {
    try {
        const { devToken } = getAuthKey();
        
        // Read the existing content
        const text = fs.readFileSync('authkey', 'utf-8');
        const lines = text.split('\n');

        // Update or add the mainToken line
        const updatedLines = lines.map(line => {
            if (line.startsWith('mainToken=')) {
                return `mainToken=${newMainToken}`;
            }
            return line;
        });

        // If the mainToken line was not present, add it
        if (!updatedLines.some(line => line.startsWith('mainToken='))) {
            updatedLines.push(`mainToken=${newMainToken}`);
        }

        // Write the updated content back to the file
        const updatedText = updatedLines.join('\n');
        fs.writeFileSync('authkey', updatedText, 'utf-8');
        
    } catch (error) {
        console.error('Error updating mainToken in authkey file:', error);
        throw error;
    }
}


async function getFetch() {
    const fetchModule = await import('node-fetch');
    return fetchModule.default;
}

function getDevToken() {
    try {
        const text = fs.readFileSync('authkey', 'utf-8');
        const devTokenMatch = text.match(/devToken=(.+)/);

        const devToken = devTokenMatch ? devTokenMatch[1].trim() : null;

        if (!devToken) {
            throw new Error('Missing dev token in authkey file');
        }

        return devToken;
    } catch (error) {
        console.error('Error reading authkey file:', error);
        throw error;
    }
}

app.post('/api/actions/:sessionId', async (req, res) => {
    const { sessionId } = req.params;  
    const { action } = req.body;

    try {
        const { devToken } = getAuthKey();
        const fetch = await getFetch();

        const url = `https://api.chaster.app/api/extensions/sessions/${sessionId}/action`;
        console.log(`Sending request to: ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${devToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
        });

        console.log(`Response status: ${response.status}`);
        console.log(`Response headers: ${JSON.stringify(response.headers.raw())}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error performing action: ${response.status} ${errorText}`);
            return res.status(response.status).json({ error: `API error: ${errorText}` });
        }

        // For successful responses, including 204 No Content
        if (response.status === 204) {
            console.log(`Action ${action.name} completed successfully`);
            return res.status(204).send();
        }

        const responseData = await response.json();
        res.json(responseData);
    } catch (error) {
        console.error('Error in /api/actions/:sessionId:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sessions/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const devToken = getDevToken();
        const fetch = await getFetch();

        updateMainToken(token);

        const url = `https://api.chaster.app/api/extensions/auth/sessions/${token}`;
        console.log(`Sending request to: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${devToken}`,
                'Accept': 'application/json'
            }
        });

        console.log(`Response status: ${response.status}`);
        console.log(`Response headers: ${JSON.stringify(response.headers.raw())}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error fetching session info: ${response.status} ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Session info fetched successfully');
        
        // Send the entire data object to the frontend
        res.json(data);
    } catch (error) {
        console.error('Error in /api/sessions/:token:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, '127.0.0.1', () => {
    console.log(`Server running on http://127.0.0.1:${port}`);
});
