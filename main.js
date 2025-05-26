// PWA Install functionality
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPrompt();
});

function showInstallPrompt() {
    const installPrompt = document.getElementById('install-prompt');
    const installButton = document.getElementById('install-button');
    const dismissButton = document.getElementById('dismiss-button');
    
    installPrompt.style.display = 'block';
    
    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
            installPrompt.style.display = 'none';
        }
    });
    
    dismissButton.addEventListener('click', () => {
        installPrompt.style.display = 'none';
    });
}

// App functionality
function startWorkout() {
    alert('🔥 Let\'s get this workout started! 💪');
    // Here you would implement actual workout functionality
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Check if app is running in standalone mode
function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
}

if (isStandalone()) {
    console.log('App is running in standalone mode');
}
