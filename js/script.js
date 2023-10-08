//Login page
let projectId = null;
let privateCode= null;
let projectInfos = null;

// Get references to form elements
const authForm = document.getElementById('auth-form');
const authenticateButton = document.getElementById('authenticate');
const projectIdInput = document.getElementById('project-id');
const privateCodeInput = document.getElementById('private-code');

const mainApiUrl = 'https://ihatemoney.org/api/projects/'

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

// Function to get the name of a member by their ID from projectInfos
function getMemberNameById(memberId) {
    // Check if projectInfos is not null and contains the 'members' property
    if (projectInfos && projectInfos.owers) {
        // Find the member in the 'members' array by their 'id'
        const member = projectInfos.owers.find(member => member.id === memberId);

        // If the member is found, return their 'name'
        if (member) {
            return member.name;
        } else {
            return 'Member not found';
        }
    } else {
        return 'Project information not available';
    }
}


//get info of a project
function fetchinfo(projectId, privateCode) {
	// Define the API URL for fetching info
	const apiUrl = mainApiUrl + projectId + '/bills';

	// Define headers for basic authentication
    const headers = new Headers();
    headers.append('Authorization', 'Basic ' + btoa(projectId + ':' + privateCode));

    // Make a GET request to fetch project information
    return fetch(apiUrl, {
        method: 'GET',
        headers: headers
    })
    .then(response => {
        if (response.status === 200) {
            return response.json(); // Parse the response JSON
        } else {
            throw new Error('Failed to fetch project information. Please check your credentials.');
        }
    })
    .then(data => {
        // Store the project information in the global variable
        projectInfos = data[0];
        // You can access projectInfos anywhere in your code
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message);
    });
};


// page 2, show bills


// Function to fetch and display bills after authentication
function fetchBills(projectId, privateCode) {
    // Define the API URL for fetching bills
	const apiUrl = mainApiUrl + projectId + '/bills';
    // Define headers for basic authentication
    const headers = new Headers();
    headers.append('Authorization', 'Basic ' + btoa(projectId + ':' + privateCode));

    // Make a GET request to fetch bills
    fetch(apiUrl, {
        method: 'GET',
        headers: headers
    })
    .then(response => {
        if (response.status === 200) {
            return response.json(); // Parse the response JSON
        } else {
            throw new Error('Failed to fetch bills. Please check your credentials.');
        }
    })
    .then(data => {
        // Display the list of bills on the page
        displayBills(data);
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message);
    });
}

// Function to display the list of bills on the page
function displayBills(bills) {
    // Get a reference to the #bills section in your HTML
    const billsSection = document.getElementById('bills_list');

    // Clear any existing content in the bills section
    billsSection.innerHTML = '';

    // Create a list (ul) to display the bills
    const ul = document.createElement('ul');

    // Iterate through the list of bills and create list items (li) for each bill
    bills.forEach(bill => {
        const li = document.createElement('li');
        li.textContent = `${bill.what}, ${bill.amount} ${bill.original_currency} Payed by ${getMemberNameById(bill.payer_id)}`;
        ul.appendChild(li);
    });

    // Append the list to the bills section
    billsSection.appendChild(ul);
}
