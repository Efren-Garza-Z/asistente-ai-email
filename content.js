
const ORIGIN_TRIAL_TOKEN = "AjtNhFShyXPOmmequ53K5zpXLbsI8YwA4GCSYQGSOOjYC7wCOin3VRQlU6TqCGT6GpsszPGZkDN/59qh3nBy4AcAAABleyJvcmlnaW4iOiJodHRwczovL2xvaG9vYmtjbm9pZ21jZXBwYmpia29vZGRqYmdjcGJoOjQ0MyIsImZlYXR1cmUiOiJBSVdyaXRlckFQSSIsImV4cGlyeSI6MTc2OTQ3MjAwMH0="; 
let rewriterInstance = null;


async function initializeAI() {
 
    if (!('Rewriter' in self)) {
        console.error("❌ La API de Rewriter no es visible. Token no aceptado o Chrome incompatible.");
        return;
    }

    console.log("✅ Objeto Rewriter visible. Comprobando disponibilidad del modelo...");
    const availability = await Rewriter.availability();
    let rewriter;

    if (availability === 'available') {
        console.log("🚀 Gemini Nano está listo. Creando instancia Rewriter...");

        initAssistantUI();
        
    } else if (availability === 'downloadable') {
        console.log("⚠️ Modelo disponible para descarga. Requiere acción/interacción del usuario.");
        initAssistantUI();

    } else {
        console.warn(`❌ API no utilizable. Estado: ${availability}`);
    }
}

// --- LÓGICA DE INYECCIÓN DEL TOKEN ---
// (Tu código de inyección del token está bien, lo dejamos simplificado aquí)
function injectOriginTrialToken() {
    // ... (Tu código de inyección del token, simplificado por espacio) ...
    if (document.querySelector('meta[http-equiv="origin-trial"]')) {
      initializeAI(); // Llama a la lógica de la IA después de verificar la inyección
      return;
    }
    
    const head = document.head || document.documentElement;
    if (!head) {
      setTimeout(injectOriginTrialToken, 200); 
      return;
    }
    
    console.log("✅ Token de Prueba de Origen inyectado con éxito.");
    initializeAI(); // Llama a la lógica de la IA después de la inyección
}

// Lanza la inyección de forma inicial.
injectOriginTrialToken();

// Observador para manejar las navegaciones de Gmail/Outlook sin recarga completa
const observer = new MutationObserver(() => {
  // Solo reinyecta si el token se ha perdido del DOM
  if (!document.querySelector('meta[http-equiv="origin-trial"]')) {
    injectOriginTrialToken();
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });

