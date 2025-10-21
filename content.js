
const ORIGIN_TRIAL_TOKEN = "AjtNhFShyXPOmmequ53K5zpXLbsI8YwA4GCSYQGSOOjYC7wCOin3VRQlU6TqCGT6GpsszPGZkDN/59qh3nBy4AcAAABleyJvcmlnaW4iOiJodHRwczovL2xvaG9vYmtjbm9pZ21jZXBwYmpia29vZGRqYmdjcGJoOjQ0MyIsImZlYXR1cmUiOiJBSVdyaXRlckFQSSIsImV4cGlyeSI6MTc2OTQ3MjAwMH0=";
let rewriterInstance = null;


/**
 * Initializes the AI functionality by checking API availability and setting up the UI
 */
async function initializeAI() {
 
    if (!('Rewriter' in self)) {
        console.error("❌ Rewriter API not visible. Token not accepted or Chrome incompatible.");
        return;
    }

    console.log("✅ Rewriter object visible. Checking model availability...");
    const availability = await Rewriter.availability();
    let rewriter;

    if (availability === 'available') {
        console.log("🚀 Gemini Nano is ready. Creating Rewriter instance...");
        initAssistantUI();
        
    } else if (availability === 'downloadable') {
        console.log("⚠️ Model available for download. Requires user action/interaction.");
        initAssistantUI();

    } else {
        console.warn(`❌ API not usable. Status: ${availability}`);
    }
}

/**
 * Injects the origin trial token into the page to enable experimental features
 * Re-injects the token if it's lost during SPA navigation
 */
function injectOriginTrialToken() {
    if (document.querySelector('meta[http-equiv="origin-trial"]')) {
      initializeAI(); // Call AI logic after verifying injection
      return;
    }
    
    const head = document.head || document.documentElement;
    if (!head) {
      setTimeout(injectOriginTrialToken, 200); 
      return;
    }
    
    console.log("✅ Origin Trial Token successfully injected.");
    initializeAI(); // Call AI logic after injection
}

// Initial token injection
injectOriginTrialToken();

/**
 * Observer to handle Gmail/Outlook SPA navigation without complete page reload
 * Re-injects the token if it's removed from DOM
 */
const observer = new MutationObserver(() => {
  if (!document.querySelector('meta[http-equiv="origin-trial"]')) {
    injectOriginTrialToken();
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });

