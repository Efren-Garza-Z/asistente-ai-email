/**
 * Initializes the assistant UI by observing DOM mutations and adding panels to email compose areas
 */
function initAssistantUI() {
  const observer = new MutationObserver((mutations) => {
    // Find any message body editors that don't have the panel yet
    const candidates = Array.from(document.querySelectorAll(
      'div[aria-label="Cuerpo del mensaje"], div[aria-label="Message body"]'
    ));

    candidates.forEach(composeArea => {
      // Move up to nearest dialog to associate buttons in toolbar
      if (!composeArea) return;

      const dialog = composeArea.closest('div[role="dialog"]') || composeArea.closest('.nH'); // fallback

      // Avoid duplicates using dataset flag
      if (composeArea.dataset.assistantAdded === 'true') return;
      composeArea.dataset.assistantAdded = 'true';

      // Create new panel for this composeArea (closure captures composeArea)
      const buttonPanel = createButtonsForCompose(composeArea);

      // Try to find toolbar within dialog
      let toolbarContainer = null;
      try {
        if (dialog) toolbarContainer = dialog.querySelector('.aDh') || dialog.querySelector('[aria-label="Formatting options"]');
      } catch (e) { toolbarContainer = null; }

      if (toolbarContainer) {
        // Insert without moving/using same node
        toolbarContainer.appendChild(buttonPanel);
      } else {
        // Fallback: insert next to composeArea
        composeArea.parentNode.insertBefore(buttonPanel, composeArea.nextSibling);
      }

      console.log("Assistant injected in composer:", composeArea);
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Updates the context button appearance based on whether there is saved text
 * @param {HTMLElement} contextButton - The "Context" button element
 * @param {string} currentContext - The current saved context text (can be empty)
 */
function updateContextButtonAppearance(contextButton, currentContext) {
    const activeClass = 'ai-context-button-changed';
    
    // Ensure base button has normal class
    contextButton.classList.add('ai-context-button'); 

    if (currentContext.trim() !== '') {
        // Mark as active if there is text
        contextButton.classList.add(activeClass);
        contextButton.classList.remove('ai-context-button');
    } else {
        // Set to base/normal state if empty
        contextButton.classList.remove(activeClass);
    }
}

/**
 * Creates the button panel for a compose area with context and tone options
 * @param {HTMLElement} composeArea - The email compose area element
 * @returns {HTMLElement} The created button panel container
 */
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

  // Define tone options
  const tones = [
    { label: 'Formal', tone: 'more-formal' },
    { label: 'Shorter', tone: 'as-is' },
    { label: 'Friendly', tone: 'more-casual' }
  ];

  // Create tone buttons
  tones.forEach(option => {
    const button = document.createElement('button');
    button.textContent = option.label;
    button.className = 'ai-button-styles';
    button.style.marginRight = '6px';
    button.style.cursor = 'pointer';

    button.addEventListener('click', async (ev) => {
      ev.preventDefault();

      // Find relevant elements within same dialog
      const dialog = composeArea.closest('div[role="dialog"]') || composeArea.closest('.nH');
      const subjectInput = dialog ? dialog.querySelector('input[name="subjectbox"]') : document.querySelector('input[name="subjectbox"]');

      // Get selection (if exists)
      let selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const anchor = selection.anchorNode;
        if (anchor && !composeArea.contains(anchor)) {
          selection = null;
        }
      }

      // Determine target:
      // - Subject input if focused
      // - Selection in body if exists
      // - Compose area if focused
      const active = document.activeElement;
      const targetIsSubject = subjectInput && subjectInput === active;
      const targetIsBody = composeArea.contains(active) || selection;

      if (!targetIsSubject && !targetIsBody) {
        composeArea.focus();
      }

      // Get original text to rewrite
      let originalText = "";
      if (targetIsSubject) {
        originalText = subjectInput.value || "";
      } else if (selection && selection.toString().trim()) {
        originalText = selection.toString();
      } else {
        originalText = composeArea.innerText || composeArea.textContent || "";
      }

      if (!originalText || !originalText.trim()) {
        alert("Please select text or write something in subject/body to " + option.label.toLowerCase());
        return;
      }

      // UI feedback during processing
      button.disabled = true;
      const prevText = button.textContent;
      button.textContent = "Processing...";

      const userContext = composeArea.dataset.aiContext || '';

      try {
        if (currentContextModal) {
           currentContextModal.remove();
           currentContextModal = null;
         }

        // Call Rewriter with settings
        const tempRewriter = await Rewriter.create({
          tone: option.tone,
          sharedContext: userContext.trim() ? userContext.trim() : undefined,
          length: option.label === "Shorter" ? "shorter" : "as-is",
        });

        // Insert result based on target
        if (targetIsSubject) {
          const rewrittenText = await tempRewriter.rewrite(originalText);
          subjectInput.focus();
          subjectInput.value = rewrittenText;
          subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          composeArea.focus();

          // Clear existing content
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0 && composeArea.contains(sel.anchorNode)) {
            document.execCommand("delete", false, null);
          } else {
            composeArea.innerText = '';
          }

          // Stream rewritten content
          const stream = tempRewriter.rewriteStreaming(originalText);
          
          for await (const chunk of stream) {
            document.execCommand("insertText", false, chunk);
          }
        }

        tempRewriter.destroy();
      } catch (err) {
        console.error("Rewriter error:", err);
        alert("Error rewriting. Check console.");
      } finally {
        button.disabled = false;
        button.textContent = prevText;
      }
    });

    container.appendChild(button);
  });

  return container;
}

// Global variable to ensure only one modal is open at a time
let currentContextModal = null; 

/**
 * Shows the context input modal for setting email context
 * @param {HTMLElement} composeArea - The email compose area element
 * @param {HTMLElement} anchorButton - The button that triggered the modal
 */
function showContextModal(composeArea, anchorButton) {
    
    if (currentContextModal) {
        currentContextModal.remove();
        currentContextModal = null;
    }

    // Create main modal container
    const modal = document.createElement('div');
    currentContextModal = modal;
    
    // Set positioning and floating styles
    modal.style.cssText = `
        position: absolute;
        bottom: 100%;
        left: 0;
        width: 320px;
        z-index: 2000;
        padding: 10px;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
    
    // Create context textarea
    const contextTextarea = document.createElement('textarea');
    contextTextarea.value = composeArea.dataset.aiContext;
    contextTextarea.placeholder = 'Ex: You are responding to an angry customer complaint. Be conciliatory and offer a discount coupon.';
    contextTextarea.style.cssText = `
        width: 100%;
        min-height: 80px;
        padding: 5px;
        border: 1px solid #ddd;
        border-radius: 4px;
        resize: vertical;
    `;
    modal.appendChild(contextTextarea);

    // Create action buttons container
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px;';

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = 'padding: 6px 12px; border: none; background: #eee; border-radius: 4px; cursor: pointer;';
    cancelButton.onclick = () => {
        modal.remove();
        currentContextModal = null;
    };
    buttonGroup.appendChild(cancelButton);

    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.cssText = 'padding: 6px 12px; border: none; background: #4285f4; color: white; border-radius: 4px; cursor: pointer;';
    saveButton.onclick = () => {
        const newContext = contextTextarea.value.trim();
        composeArea.dataset.aiContext = newContext;
        console.log(`Context saved: "${composeArea.dataset.aiContext}"`);

        updateContextButtonAppearance(anchorButton, newContext);

        modal.remove();
        currentContextModal = null;
    };
    buttonGroup.appendChild(saveButton);
    
    modal.appendChild(buttonGroup);

    // Insert modal into DOM
    anchorButton.parentElement.appendChild(modal);
    contextTextarea.focus();
}