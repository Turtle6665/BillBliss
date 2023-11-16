//Login page
let projectId = null;
let privateCode= null;

// Get references to form elements
const authForm = document.getElementById('auth-form');
const authenticateButton = document.getElementById('authenticate');
const projectIdInput = document.getElementById('project-id');
const privateCodeInput = document.getElementById('private-code');

const apiUrl = 'https://ihatemoney.org/api/projects/'

// Event listener for the authentication button click
authenticateButton.addEventListener('click', () => {
    projectId = projectIdInput.value;
    privateCode = privateCodeInput.value;

    // Perform authentication here
    authenticateToIHateMoney(projectId, privateCode);
});

// Function to authenticate to Ihatemoney.org API
function authenticateToIHateMoney(projectId, privateCode) {
    // Make a request to Ihatemoney.org API for authentication
    // You can use the fetch API or any other method to send a POST request
    // Replace 'YOUR_API_URL' with the actual API endpoint
    const apiUrl = mainApiUrl + projectId;

    // Define headers for basic authentication
    const headers = new Headers();
    headers.append('Authorization', 'Basic ' + btoa(projectId + ':' + privateCode));

    fetch(apiUrl, {
        method: 'GET',
        headers: headers
    })
    .then(response => {
        if (response.status === 200) {
            // Authentication successful
            //alert('Authentication successful! You can now access your project.');
			// Getting information about the project
			fetchinfo(projectId, privateCode).then(
				// Call the fetchBills function after authentication
				fetchBills(projectId, privateCode)
			);
        } else {
            alert('Authentication failed. Please check your credentials.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred during authentication.');
    });
}
