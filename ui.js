
function initAssistantUI() {
  const observer = new MutationObserver((mutations) => {
    // Buscar cualquier editor de cuerpo que aún no tenga el panel
    const candidates = Array.from(document.querySelectorAll(
      'div[aria-label="Cuerpo del mensaje"], div[aria-label="Message body"]'
    ));

    candidates.forEach(composeArea => {
      // Subir al dialog cercano para asociar botones en la toolbar
      if (!composeArea) return;

      const dialog = composeArea.closest('div[role="dialog"]') || composeArea.closest('.nH'); // fallback

      // Evitar duplicados: marca dataset
      if (composeArea.dataset.assistantAdded === 'true') return;
      composeArea.dataset.assistantAdded = 'true';

      // Crear un panel nuevo para este composeArea (closure captura composeArea)
      const buttonPanel = createButtonsForCompose(composeArea);

      // Intenta encontrar toolbar dentro del dialog
      let toolbarContainer = null;
      try {
        if (dialog) toolbarContainer = dialog.querySelector('.aDh') || dialog.querySelector('[aria-label="Formatting options"]');
      } catch (e) { toolbarContainer = null; }

      if (toolbarContainer) {
        // Insertarlo sin mover/usar un mismo nodo
        toolbarContainer.appendChild(buttonPanel);
      } else {
        // fallback: insertarlo junto al composeArea
        composeArea.parentNode.insertBefore(buttonPanel, composeArea.nextSibling);
      }

      console.log("Asistente inyectado en composer:", composeArea);
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Actualiza la apariencia del botón de contexto basado en si hay texto guardado.
 * @param {HTMLElement} contextButton - El botón "📝 Contexto".
 * @param {string} currentContext - El texto de contexto actual guardado (puede ser '').
 */
function updateContextButtonAppearance(contextButton, currentContext) {
    const activeClass = 'ai-context-button-changed';
    
    // Se asegura de que el botón base tenga la clase normal.
    contextButton.classList.add('ai-context-button'); 

    if (currentContext.trim() !== '') {
        // Si hay texto, lo marcamos como activo
        contextButton.classList.add(activeClass);
        contextButton.classList.remove('ai-context-button'); // O cualquier clase de inactividad
    } else {
        // Si no hay texto, lo ponemos en su estado base/normal
        contextButton.classList.remove(activeClass);
        // Opcional: podrías agregar una clase 'ai-context-button-disabled' aquí si quieres un estilo diferente para el vacío
    }
}


function createButtonsForCompose(composeArea) {
  const container = document.createElement('div');
  container.className = 'ai-panel-styles';
  container.style.margin = '6px 8px';

  composeArea.dataset.aiContext = composeArea.dataset.aiContext || '';

  const contextButton = document.createElement('button');
  contextButton.textContent = 'Context';
  updateContextButtonAppearance(contextButton, composeArea.dataset.aiContext);


  contextButton.addEventListener('click', () => {
       showContextModal(composeArea, contextButton);
    });

  container.appendChild(contextButton);

  const tones = [
    { label: 'Formal', tone: 'more-formal' },
    { label: 'Shorter', tone: 'as-is' },
    { label: 'Friendly', tone: 'more-casual' }
  ];

  tones.forEach(option => {
    const button = document.createElement('button');
    button.textContent = option.label;
    button.className = 'ai-button-styles';
    button.style.marginRight = '6px';
    button.style.cursor = 'pointer';

    // closure: cada botón "sabe" a qué composeArea pertenece
    button.addEventListener('click', async (ev) => {
      ev.preventDefault();

      // 1) Determinar elementos relevantes dentro del mismo dialog
      const dialog = composeArea.closest('div[role="dialog"]') || composeArea.closest('.nH');
      const subjectInput = dialog ? dialog.querySelector('input[name="subjectbox"]') : document.querySelector('input[name="subjectbox"]');

      // 2) Obtener selección (puede no existir)
      let selection = window.getSelection();
      // si la selección existe pero está fuera del composeArea, ignorarla
      if (selection && selection.rangeCount > 0) {
        const anchor = selection.anchorNode;
        if (anchor && !composeArea.contains(anchor)) {
          // selección fuera del composeArea -> descartar
          selection = null;
        }
      }

      // 3) Decidir objetivo:
      // - Si el subjectInput tiene foco -> insertar en asunto
      // - else si hay selección dentro del body -> reemplazar selección
      // - else si composeArea tiene foco -> reemplazar todo o insertar en cursor
      const active = document.activeElement;
      const targetIsSubject = subjectInput && subjectInput === active;
      const targetIsBody = composeArea.contains(active) || selection;

      if (!targetIsSubject && !targetIsBody) {
        // Si no está el cursor, poner foco en body por defecto
        composeArea.focus();
      }

      // Obtener texto original a reescribir
      let originalText = "";
      if (targetIsSubject) {
        originalText = subjectInput.value || "";
      } else if (selection && selection.toString().trim()) {
        originalText = selection.toString();
      } else {
        // tomar todo el contenido de body si no hay selección
        originalText = composeArea.innerText || composeArea.textContent || "";
      }

      if (!originalText || !originalText.trim()) {
        alert("Selecciona texto o escribe algo en el asunto/cuerpo para " + option.label.toLowerCase());
        return;
      }

      // UI feedback
      button.disabled = true;
      const prevText = button.textContent;
      button.textContent = "Processing...";

      const userContext = composeArea.dataset.aiContext || '';

      try {

        if (currentContextModal) {
           currentContextModal.remove();
           currentContextModal = null;
         }
        // Llamada a Rewriter
        const tempRewriter = await Rewriter.create({
          tone: option.tone,
          sharedContext: userContext.trim() ? userContext.trim() : undefined,
          length: option.label === "Abreviar" ? "shorter" : "as-is",
        });
        const rewrittenText = await tempRewriter.rewrite(originalText);

        // INSERTAR RESULTADO correctamente según objetivo
        if (targetIsSubject) {
          // Asunto: input normal -> value + evento 'input' para que Gmail detecte el cambio
          const rewrittenText = await tempRewriter.rewrite(originalText);
          subjectInput.focus();
          subjectInput.value = rewrittenText;
          subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          // Cuerpo: preferimos usar execCommand sobre el foco
          // Aseguramos que el composeArea tenga foco
            composeArea.focus();

            // 2a. Reemplazar selección/contenido con texto vacío antes de hacer streaming
            // Esto asegura que el texto viejo desaparezca inmediatamente.
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && composeArea.contains(sel.anchorNode)) {
                // Si hay selección, borra la selección.
                document.execCommand("delete", false, null);
            } else {
                // Si no hay selección, borra todo el contenido (fallback).
                composeArea.innerText = '';
            }

            // 2b. Iniciar el streaming
            const stream = tempRewriter.rewriteStreaming(originalText);
            
            // 2c. Insertar los "chunks" a medida que llegan
            for await (const chunk of stream) {
            // Usamos execCommand para insertar cada pequeño fragmento de texto.
            // Esto simula la escritura de un usuario en el contenteditable.
            document.execCommand("insertText", false, chunk);
            
            // Opcional: Disparar el evento 'input' para notificar a Gmail
            // (Se puede disparar menos frecuentemente para mejor performance,
            // o después del loop si es muy ruidoso).
            // composeArea.dispatchEvent(new Event('input', { bubbles: true })); 
            }
        }

        tempRewriter.destroy();
      } catch (err) {
        console.error("Rewriter error:", err);
        alert("Error al reescribir. Revisa la consola.");
      } finally {
        button.disabled = false;
        button.textContent = prevText;
      }
    });

    container.appendChild(button);
  });

  return container;
}


// Variable global para asegurarse de que solo un modal esté abierto a la vez
let currentContextModal = null; 

function showContextModal(composeArea, anchorButton) {
    
    // Si hay un modal abierto, lo cerramos
    if (currentContextModal) {
        currentContextModal.remove();
        currentContextModal = null;
    }

    // 1. Crear el contenedor principal del modal
    const modal = document.createElement('div');
    currentContextModal = modal;
    
    // Posicionamiento absoluto y estilos para flotar
    modal.style.cssText = `
        position: absolute;
        bottom: 100%; /* Posicionarlo justo encima del botón */
        left: 0;
        width: 320px;
        z-index: 2000; /* Alto z-index para estar sobre Gmail */
        padding: 10px;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
    
    // 2. Crear el área de texto (TextArea)
    const contextTextarea = document.createElement('textarea');
    contextTextarea.value = composeArea.dataset.aiContext; // Carga el valor actual
    contextTextarea.placeholder = 'Ej: Estás respondiendo a una queja de un cliente muy enojado. Sé conciliador y ofrece un cupón de descuento.';
    contextTextarea.style.cssText = `
        width: 100%;
        min-height: 80px;
        padding: 5px;
        border: 1px solid #ddd;
        border-radius: 4px;
        resize: vertical;
    `;
    modal.appendChild(contextTextarea);

    // 3. Crear el contenedor para los botones de acción
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px;';

    // --- Botón de CANCELAR ---
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancelar';
    // Estilo neutro para cancelar
    cancelButton.style.cssText = 'padding: 6px 12px; border: none; background: #eee; border-radius: 4px; cursor: pointer;';
    cancelButton.onclick = () => {
        modal.remove();
        currentContextModal = null;
    };
    buttonGroup.appendChild(cancelButton);

    // --- Botón de GUARDAR ---
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Guardar';
    // Estilo primario para guardar
    saveButton.style.cssText = 'padding: 6px 12px; border: none; background: #4285f4; color: white; border-radius: 4px; cursor: pointer;';
    saveButton.onclick = () => {
        // Almacena el valor en el dataset SÓLO cuando se hace clic en Guardar
        const newContext = contextTextarea.value.trim();
        composeArea.dataset.aiContext = newContext;
        console.log(`Contexto guardado: "${composeArea.dataset.aiContext}"`);

        updateContextButtonAppearance(anchorButton, newContext);

        modal.remove();
        currentContextModal = null;
    };
    buttonGroup.appendChild(saveButton);
    
    modal.appendChild(buttonGroup);

    // 4. Insertar el modal en el DOM
    // Lo adjuntamos al padre del botón de contexto para mantener el posicionamiento relativo
    anchorButton.parentElement.appendChild(modal); 
    contextTextarea.focus(); // Foco al textarea para empezar a escribir
}