let webhookUrl;

// Function to fetch the webhook URL
async function fetchWebhookUrl() {
  try {
    const response = await fetch('authkey');
    const text = await response.text();
    const match = text.match(/webhook=(.*)/);
    if (match) {
      webhookUrl = match[1].trim();
    } else {
      throw new Error('Webhook URL not found in authkey file');
    }
  } catch (error) {
    console.error('Error fetching webhook URL:', error);
    alert('Failed to load webhook URL. Please check your authkey file.');
  }
}

let mainToken;

async function fetchMainToken() {
  try {
    const response = await fetch('authkey');
    const text = await response.text();
    const match = text.match(/mainToken=(.*)/);
    if (match) {
      mainToken = match[1].trim();
      console.log('Using mainToken:', mainToken);
    } else {
      throw new Error('mainToken not found in authkey file');
    }
  } catch (error) {
    console.error('Error fetching mainToken:', error);
    alert('Failed to load mainToken. Please check your authkey file.');
  }
}

let sessionId = null;

async function getSessionInfo() {
    try {
        const response = await fetch(`/api/sessions/${mainToken}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        sessionId = data.session.sessionId; // Store the sessionId
        displaySessionInfo(data);
    } catch (error) {
        console.error('Error fetching session info:', error);
        displayError(`Failed to fetch session info: ${error.message}`);
    }
}

const controls = [
  {
    label: 'Volume Un/Mute',
    uri: 'volume?volString=0',
    stopUri: 'volume?volString=100',
    category: 'Sound Control',
    isVolumeMuted: false // to keep track of the volume state
  },
  {
    label: 'Clicker',
    uri: 'clicker',
    category: 'Sound Control'
  },
  {
    label: 'Send Pup a Command',
    uri: 'command?notifCom=',
    category: 'Anydesk Control'
  },
  {
    label: 'Open a Webpage',
    category: 'App Control',
    uri: 'link?link='
  },
  {
    label: 'Start Recording',
    uri: 'record?on=true',
    stopUri: 'record?on=false',
    category: 'Sound Control',
    isRecording: false // to keep track of the recording state
  },
  {
    label: 'Block Screen Input',
    uri: 'touch?touch=true',
    category: 'App Control',
    stopUri: 'touch?touch=false',
    isTouchBlocked: false // to keep track of the touch state
  },
  {
    label: 'Un/Lock Phone',
    uri: 'lock?status=lock',
    stopUri: 'lock?status=unlock',
    category: 'Anydesk Control',
    isLocked: false // to keep track of the lock state
  },
  {
    label: 'Lock Lewd Apps',
    uri: 'lock?lock=lock',
    category: 'App Control',
    stopUri: 'lock?lock=unlock',
    isLocked: false // to keep track of the lock state
  },
//  {
//    label: 'Fluster the Pup',
//    category: 'Sound Control',
//    uri: 'moan'
//  },
  {
    label: 'Send Tweet',
    category: 'App Control',
    uri: 'x?tweet='
  },
  {
    label: 'Add Time',
    category: 'Chastity Control',
    action: 'add_time'
  },
  {
    label: 'Remove Time',
    category: 'Chastity Control',
    action: 'remove_time'
  },
  {
    label: 'Freeze the Time',
    category: 'Chastity Control',
    action: 'toggle_freeze'
  },
  {
    label: 'Pillory',
    category: 'Chastity Control',
    action: 'pillory'
  }
];

const containers = {
  'Sound Control': document.getElementById('sound-controls-grid'),
  'App Control': document.getElementById('app-controls-grid'),
  'Anydesk Control': document.getElementById('anydesk-controls-grid'),
  'Chastity Control': document.getElementById('chastity-controls-grid')
};

function createControlElement(control) {
  const controlElement = document.createElement('li');
  controlElement.appendChild(document.createTextNode(control.label));
  controlElement.className = 'grid-cell';
  controlElement.setAttribute('role', 'button');
  controlElement.dataset.label = control.label;
  controlElement.addEventListener('click', () => handleControlClick(control, controlElement));
  return controlElement;
}

function displaySessionInfo(data) {
  const chastityInfo = document.getElementById('chastity-info');
  if (chastityInfo) {
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

      chastityInfo.innerHTML = `
          <h3>Session Information:</h3>
          <p>Status: ${status}</p>
          <p>End Date: ${endDate}</p>
          <p>Time Remaining: ${timeRemainingStr}</p>
      `;
  } else {
      console.warn("Element with id 'sessionInfo' not found");
  }
  
}

function appendControls() {
  controls.forEach(control => {
    const container = containers[control.category];
    if (container) {
      container.appendChild(createControlElement(control));
    }
  });
}

function updateSlider(slider) {
  const value = slider.value;
  const container = slider.parentElement;
  container.style.background = `linear-gradient(to right, #ff4081 ${value}%, #22262B ${value}%)`;
  container.querySelector('.slider-value').textContent = value;
  callWebHook('volume?volString=' + value);
  const volumeButton = document.querySelector('.grid-cell[data-label="Volume Un/Mute"]');
  if (value > 0 && value < 100) {
    volumeButton.textContent = 'Volume Un/Mute';
    controls.find(control => control.label === 'Volume Un/Mute').isVolumeMuted = false;
  }
}

function setSliderValue(value) {
  const slider = document.querySelector('.volume-slider');
  slider.value = value;
  updateSlider(slider);
}

function handleControlClick(control, controlElement) {
  controlElement.classList.add('pressed');
  setTimeout(() => {
    controlElement.classList.remove('pressed');
  }, 200);
  switch (control.label) {
    case 'Volume Un/Mute':
      toggleVolume(control, controlElement);
      break;
    case 'Start Recording':
      toggleRecording(control, controlElement);
      break;
    case 'Send Pup a Command':
      openDialog('commandDialog', 'commandInput', 'sendCommandButton', 'closeCommandDialogButton', control.uri);
      break;
    case 'Open a Webpage':
      openDialog('linkDialog', 'linkInput', 'sendLinkButton', 'closeLinkDialogButton', control.uri);
      break;
    case 'Block Screen Input':
      toggleTouchBlock(control, controlElement);
      break;
    case 'Lock Lewd Apps':
      toggleLock(control, controlElement);
      break;
    case 'Send Tweet':
      openDialog('tweetDialog', 'tweetInput', 'sendTweetButton', 'closeTweetDialogButton', control.uri);
      break;
    case 'Un/Lock Phone':
      togglePhoneLock(control, controlElement);
      break;
    case 'Add Time':
      openAddTimeDialog(control.action);
      break;
    case 'Remove Time':
      openRemoveTimeDialog(control.action);
      break;
    case 'Freeze the Time':
      toggleFreezeTime(control, controlElement);
      break;
    case 'Pillory':
      openPilloryDialog(control);
      break;
  }
}

function togglePhoneLock(control, controlElement) {
  const action = control.isLocked ? control.stopUri : control.uri;
  callWebHook(action);
  controlElement.textContent = control.isLocked ? 'Unlocked' : 'Locked';
  control.isLocked = !control.isLocked;
}

function toggleVolume(control, controlElement) {
  const action = control.isVolumeMuted ? control.stopUri : control.uri;
  callWebHook(action);
  controlElement.textContent = control.isVolumeMuted ? 'Maxed' : 'Muted';
  setSliderValue(control.isVolumeMuted ? 100 : 0);
  control.isVolumeMuted = !control.isVolumeMuted;
}

function toggleRecording(control, controlElement) {
  const action = control.isRecording ? control.stopUri : control.uri;
  callWebHook(action);
  controlElement.textContent = control.isRecording ? 'Start Recording' : 'Stop Recording';
  control.isRecording = !control.isRecording;
}

function toggleTouchBlock(control, controlElement) {
  const action = control.isTouchBlocked ? control.stopUri : control.uri;
  callWebHook(action);
  controlElement.textContent = control.isTouchBlocked ? 'Unblocked' : 'Blocked';
  control.isTouchBlocked = !control.isTouchBlocked;
}

function toggleLock(control, controlElement) {
  const action = control.isLocked ? control.stopUri : control.uri;
  callWebHook(action);
  controlElement.textContent = control.isLocked ? 'Lock Lewd Apps' : 'Unlock Lewd Apps';
  control.isLocked = !control.isLocked;
}


async function callWebHook(uri) {
  if (!webhookUrl) {
    await fetchWebhookUrl();
  }
  
  if (!webhookUrl) {
    console.error('Webhook URL is not available');
    alert('Webhook URL is not available. Cannot perform action.');
    return;
  }

  fetch(`${webhookUrl}/${uri}`)
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      console.log('Webhook called successfully');
    })
    .catch(error => {
      console.error('There has been a problem with your fetch operation:', error);
      alert('An error occurred while calling the webhook');
    });
}

function openDialog(dialogId, inputId, sendButtonId, closeButtonId, baseUri) {
  const dialog = document.getElementById(dialogId);
  const sendButton = document.getElementById(sendButtonId);
  const closeButton = document.getElementById(closeButtonId);
  const input = document.getElementById(inputId);

  dialog.showModal();

  sendButton.onclick = function() {
    const value = input.value.trim();
    if (value) {
      const fullUri = baseUri + encodeURIComponent(value);
      callWebHook(fullUri);
      dialog.close();
    } else {
      alert('Please enter a value.');
    }
  };

  closeButton.onclick = function() {
    dialog.close();
  };
}

function populateDropdown(selectId, baseUri) {
  const select = document.getElementById(selectId);
  select.innerHTML = '';
  const maxTimeSeconds = 24 * 3600;
  for (let seconds = 0; seconds <= maxTimeSeconds; seconds += 600) {
    const option = document.createElement('option');
    option.value = seconds;
    option.text = formatTime(seconds);
    select.appendChild(option);
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function openAddTimeDialog(action) {
  openTimeDialog('Add Time', action);
}

function openRemoveTimeDialog(action) {
  openTimeDialog('Remove Time', action);
}

function openTimeDialog(title, action) {
  const dialog = document.getElementById('timeDialog');
  const titleElement = dialog.querySelector('h2');
  const input = document.getElementById('timeInput');
  const submitButton = document.getElementById('submitTimeButton');

  titleElement.textContent = title;
  input.value = '';
  dialog.showModal();

  submitButton.onclick = function() {
    const time = parseInt(input.value.trim());
    if (time && time > 0) {
      performChastityAction(action, time);  // Pass time directly
      dialog.close();
    } else {
      alert('Please enter a valid time in seconds.');
    }
  };
}

function toggleFreezeTime(control, controlElement) {
  control.isFrozen = !control.isFrozen;
  performChastityAction('toggle_freeze', { freeze: control.isFrozen });
  controlElement.textContent = control.isFrozen ? 'Unfreeze the Time' : 'Freeze the Time';
}

function openPilloryDialog(control) {
  const dialog = document.getElementById('pilloryDialog');
  const timeInput = document.getElementById('pilloryTimeInput');
  const reasonInput = document.getElementById('pilloryReasonInput');
  const submitButton = document.getElementById('pillorySendButton');

  timeInput.value = '';
  reasonInput.value = '';
  dialog.showModal();

  submitButton.onclick = function() {
    const duration = parseInt(timeInput.value.trim());
    const reason = reasonInput.value.trim();
    if (duration && duration > 0 && reason) {
      performChastityAction('pillory', { duration, reason });
      dialog.close();
    } else {
      alert('Please enter a valid time in seconds and a reason.');
    }
  };
}

async function performChastityAction(actionName, params = null) {
  if (!sessionId) {
    displayError('Session ID not available. Please try again.');
    return;
  }

  try {
    console.log(`Performing action: ${actionName} with params:`, params);
    let actionBody = { action: { name: actionName } };

    switch(actionName) {
      case 'add_time':
      case 'remove_time':
        if (typeof params !== 'number' || params < 1) {
          throw new Error('Invalid time parameter. Must be a positive integer.');
        }
        actionBody.action.params = Math.floor(params);
        break;
      case 'toggle_freeze':
        // No params needed for toggle_freeze
        break;
        case 'pillory':
          if (!params || typeof params.duration !== 'number' || params.duration < 1) {
            throw new Error('Invalid pillory parameters. Duration must be a positive integer.');
          }
          actionBody.action.params = {
            duration: Math.floor(params.duration),
            reason: params.reason || ''
          };
          break;
      default:
        throw new Error(`Unknown action: ${actionName}`);
    }

    console.log('Sending body:', JSON.stringify(actionBody));

    const response = await fetch(`/api/actions/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actionBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
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

function displayError(message) {
  const errorDiv = document.getElementById('chastity-error');
  if (errorDiv) {
      // Set the error message and styles
      errorDiv.textContent = `Error: ${message}`;
      errorDiv.classList.add('error'); // Apply error styles
      errorDiv.classList.remove('hidden'); // Ensure it is visible
      errorDiv.style.display = 'block'; // Ensure it is displayed
      
      // Set a timeout to hide the error after 5 seconds
      setTimeout(() => {
          errorDiv.classList.remove('error'); // Remove error styles
          errorDiv.classList.add('hidden'); // Hide the div
          errorDiv.style.display = 'none'; // Ensure it is hidden
      }, 5000); // 5000 milliseconds = 5 seconds
  } else {
      console.warn("Element with id 'chastity-info' not found");
  }
}

function initializeCollapsibles() {
  const toggles = document.querySelectorAll('.category-toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const targetId = toggle.getAttribute('data-target');
      const target = document.getElementById(targetId);
      target.classList.toggle('show');
    });
  });
}

// Function to toggle the visibility of the anydesk-info div and set its text
function toggleAnydeskInfo() {
  const infoDiv = document.getElementById('anydesk-info');
  const button = document.getElementById('toggle-anydesk-info'); // Select the button

  if (infoDiv && button) {
    // Toggle the visibility of the anydesk-info div
    if (infoDiv.style.display === 'block') {
      infoDiv.style.display = 'none'; // Hide the info div
      button.textContent = 'Show Anydesk Login'; // Update button text to show info
    } else {
      infoDiv.style.display = 'block'; // Show the info div
      infoDiv.innerHTML = 'lilmapletini@ad<br>pw: dumb&deniedPup'; // Insert the text with line break
      button.textContent = 'Hide Anydesk Login'; // Update button text to hide info
    }
  } else {
    console.warn("Element with id 'anydesk-info' or button with id 'toggle-anydesk-info' not found");
  }
}

// Ensure the DOM is fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('toggle-anydesk-info');
  if (button) {
    button.addEventListener('click', toggleAnydeskInfo);
  } else {
    console.warn("Button with id 'toggle-anydesk-info' not found");
  }
});



function initializeVolumeSlider() {
  const slider = document.querySelector('.volume-slider');
  const sliderValue = document.getElementById('sliderValue');
  const sliderContainer = document.getElementById('volumeSliderContainer');

  function updateSlider(value) {
    sliderValue.textContent = value;
    sliderContainer.style.background = `linear-gradient(to right, #ff4081 ${value}%, #22262B ${value}%)`;
    // Call the webhook with the new volume value
    callWebHook(`volume?volString=${value}`);
  }

  slider.addEventListener('input', (event) => {
    updateSlider(event.target.value);
  });

  // Initialize slider
  updateSlider(slider.value);
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log("DOMContentLoaded event fired");
  
  // Hide loading animation and show main content
  document.getElementById('loadingAnimation').style.display = 'none';
  document.getElementById('mainContent').classList.remove('hidden');
  
  // Fetch mainToken
  await fetchMainToken();
  
  // Initialize main functionality
  await fetchWebhookUrl();
  appendControls();
  
  // Initialize collapsible functionality
  initializeCollapsibles();
  
  // Initialize volume slider
  initializeVolumeSlider();
  
  // Get session info
  await getSessionInfo();
  
  // Additional initialization code can be added here
});

document.addEventListener('DOMContentLoaded', () => {
  const slider = document.querySelector('.volume-slider');
  const sliderValue = document.querySelector('.slider-value');

  slider.addEventListener('input', () => {
      sliderValue.textContent = slider.value;
  });

  const gridCells = document.querySelectorAll('.grid-cell');
  gridCells.forEach(cell => {
      cell.addEventListener('click', () => {
          alert(`You clicked ${cell.textContent}`);
      });
  });
});

