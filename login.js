/**
 * Login Authentication Module
 * Handles Google Sign-in and admin access control
 */

// List of allowed admin emails
const allowedAdmins = [
    "adarshshuklawork@gmail.com",
    "someone@yourteam.com"
];

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC1XazQLwfBHUW527Yqz5FyRzNFDjv5mII",
    authDomain: "smart-customer-support-portal.firebaseapp.com",
    projectId: "smart-customer-support-portal"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

/**
 * Handle Google Sign-in button click
 * Shows loading state and handles authentication
 */
document.getElementById("googleSignIn").addEventListener("click", async () => {
    const button = document.getElementById("googleSignIn");
    const buttonContent = button.querySelector(".button-content");
    const loadingSpinner = button.querySelector(".loading-spinner");
    
    try {
        // Show loading state
        buttonContent.style.display = "none";
        loadingSpinner.style.display = "block";
        button.disabled = true;
        
        // Initialize Google Auth Provider and trigger sign-in popup
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
    } catch (error) {
        alert("Login failed: " + error.message);
        
        // Reset button state on error
        buttonContent.style.display = "flex";
        loadingSpinner.style.display = "none";
        button.disabled = false;
    }
});

/**
 * Firebase Auth state observer
 * Redirects authenticated users to admin dashboard
 */
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        window.location.href = "admin.html";
    }
});