const hash = window.location.hash.substring(1);
const params = JSON.parse(decodeURIComponent(hash));
const mainToken = params.mainToken;

async function updateMainTokenOnServer(mainToken) {
    try {
        const response = await fetch('/api/updateToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mainToken })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error updating token: ${errorText}`);
        }

        console.log('Main token updated successfully');
    } catch (error) {
        console.error('Error updating main token:', error);
    }
}



console.log('Using mainToken:', mainToken);

function displayResult(message) {
    const resultDiv = document.getElementById('results');
    if (resultDiv) {
        resultDiv.textContent = message;
        resultDiv.classList.remove('hidden'); // Remove the hidden class to make it visible
        resultDiv.style.display = 'block'; // Ensure it is displayed
    } else {
        console.warn("Element with id 'result' not found");
    }
}

function displayError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.textContent = `Error: ${message}`;
        errorDiv.classList.remove('hidden'); // Remove the hidden class to make it visible
        errorDiv.style.display = 'block'; // Ensure it is displayed
    } else {
        console.warn("Element with id 'error' not found");
    }
}


function displaySessionInfo(data) {
    const sessionInfoDiv = document.getElementById('sessionInfo');
    if (sessionInfoDiv) {
        // Extract relevant information from the nested structure
        const session = data.session || {};
        const lock = session.lock || {};
        const user = lock.user || {};

        const sessionId = session.sessionId || 'N/A';
        const lockId = lock._id || 'N/A';
        const status = lock.status || 'Unknown';
        const endDate = lock.endDate ? new Date(lock.endDate).toLocaleString() : 'N/A';
        const username = user.username || 'N/A';

        // Calculate time remaining
        const now = new Date();
        const end = new Date(lock.endDate);
        const timeRemaining = end > now ? Math.floor((end - now) / 1000) : 0;

        // Calculate years, months, days, hours, and minutes
        const years = Math.floor(timeRemaining / (365 * 24 * 60 * 60));
        const months = Math.floor((timeRemaining % (365 * 24 * 60 * 60)) / (30 * 24 * 60 * 60));
        const days = Math.floor((timeRemaining % (30 * 24 * 60 * 60)) / (24 * 60 * 60));
        const hours = Math.floor((timeRemaining % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((timeRemaining % (60 * 60)) / 60);

        // Format time remaining string
        let timeRemainingStr = '';
        if (years > 0) timeRemainingStr += `${years} years `;
        if (months > 0) timeRemainingStr += `${months} months `;
        if (days > 0) timeRemainingStr += `${days} days `;
        if (hours > 0) timeRemainingStr += `${hours} hours `;
        if (minutes > 0) timeRemainingStr += `${minutes} minutes `;

        if (timeRemainingStr === '') timeRemainingStr = 'less than a minute';

        sessionInfoDiv.innerHTML = `
            <h3>Session Information:</h3>
            <p>Status: ${status}</p>
            <p>End Date: ${endDate}</p>
            <p>Time Remaining: ${timeRemainingStr}</p>
        `;
    } else {
        console.warn("Element with id 'sessionInfo' not found");
    }
    
    // Log the entire data object for debugging
    console.log('Full session data:', JSON.stringify(data, null, 2));
}


let sessionId = null;

async function getSessionInfo() {
    try {
        const response = await fetch(`/api/sessions/${mainToken}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Session info:', JSON.stringify(data, null, 2));
        sessionId = data.session.sessionId; // Store the sessionId
        displaySessionInfo(data);
    } catch (error) {
        console.error('Error fetching session info:', error);
        displayError(`Failed to fetch session info: ${error.message}`);
    }
}

async function performLockAction(actionName, params = null) {
    if (!sessionId) {
        displayError('Session ID not available. Please try again.');
        return;
    }

    try {
        console.log(`Performing action: ${actionName} with params:`, params);
        let body = { actionName };

        switch(actionName) {
            case 'add_time':
            case 'remove_time':
                body.params = parseInt(params);
                break;
            case 'pillory':
                body.params = {
                    duration: parseInt(params.duration),
                    reason: params.reason
                };
                break;
            // For freeze, unfreeze, toggle_freeze, we don't include params at all
        }

        const response = await fetch(`/api/actions/${sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (response.status === 500) {
            console.log(`Action ${actionName} completed successfully`);
            displayResult(`Action performed: ${actionName}`);
            getSessionInfo(); // Refresh session info after action
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const responseData = await response.json();
        console.log('Action response:', responseData);
        displayResult(`Action performed: ${actionName}`);
        getSessionInfo(); // Refresh session info after action
    } catch (error) {
        console.error('Error performing action:', error);
        displayError(`Failed to perform action: ${error.message}`);
    }
}

function openTimeDialog(actionName) {
    const seconds = prompt("Enter the amount of time (in seconds):");
    const parsedSeconds = parseInt(seconds, 10);

    if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
        performLockAction(actionName, parsedSeconds);
    } else {
        displayError('Invalid input. Please enter a positive number.');
    }
}

function openPilloryDialog() {
    const seconds = prompt("Enter the duration for pillory (in seconds):");
    const reason = prompt("Enter the reason for pillory (optional):");
    const parsedSeconds = parseInt(seconds, 10);

    if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
        performLockAction("pillory", { duration: parsedSeconds, reason });
    } else {
        displayError('Invalid input. Please enter a positive number.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    getSessionInfo();

    document.getElementById('addTimeButton')?.addEventListener('click', () => openTimeDialog("add_time"));
    document.getElementById('removeTimeButton')?.addEventListener('click', () => openTimeDialog("remove_time"));
    document.getElementById('freezeButton')?.addEventListener('click', () => performLockAction("freeze"));
    document.getElementById('unfreezeButton')?.addEventListener('click', () => performLockAction("unfreeze"));
    document.getElementById('toggleFreezeButton')?.addEventListener('click', () => performLockAction("toggle_freeze"));
    document.getElementById('pilloryButton')?.addEventListener('click', openPilloryDialog);
});