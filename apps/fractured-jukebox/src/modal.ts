/**
 * Lightweight modal factory for consistent modal behavior.
 * Handles open/close, backdrop dismiss, Escape key dismiss, and close button.
 * Optionally creates a standardized header with title and close button.
 */

export interface ModalOptions {
  /** Overlay element ID (uses document.getElementById) */
  overlayId?: string;
  /** Overlay element (for container-scoped modals) */
  overlay?: HTMLElement;
  /** Close button element ID (uses document.getElementById) */
  closeButtonId?: string;
  /** Close button element (for container-scoped modals) */
  closeButton?: HTMLElement;
  /** Modal title - if provided, creates a header with title and close button */
  title?: string;
  /** Dismiss when clicking backdrop (default: true) */
  dismissOnBackdrop?: boolean;
  /** Dismiss when pressing Escape key (default: true) */
  dismissOnEscape?: boolean;
  /** Callback when modal opens */
  onOpen?: () => void;
  /** Callback when modal closes */
  onClose?: () => void;
}

export interface Modal {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  /** Update the modal title (only works if title was provided at creation) */
  setTitle: (title: string) => void;
}

export function createModal(options: ModalOptions): Modal {
  const {
    overlayId,
    overlay: overlayEl,
    closeButtonId,
    closeButton: closeButtonEl,
    title,
    dismissOnBackdrop = true,
    dismissOnEscape = true,
    onOpen,
    onClose,
  } = options;

  // Resolve overlay element
  const overlay = overlayEl ?? (overlayId ? document.getElementById(overlayId) : null);
  if (!overlay) {
    throw new Error(`Modal overlay element not found: ${overlayId ?? 'no element provided'}`);
  }

  let closeButton = closeButtonEl ?? (closeButtonId ? document.getElementById(closeButtonId) : null);
  let titleSpan: HTMLSpanElement | null = null;

  // Create header if title provided
  if (title) {
    const content = overlay.firstElementChild as HTMLElement;
    if (content) {
      const header = document.createElement('div');
      header.className = 'modal-header';

      titleSpan = document.createElement('span');
      titleSpan.textContent = title;
      header.appendChild(titleSpan);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.type = 'button';
      header.appendChild(closeBtn);

      content.prepend(header);
      closeButton = closeBtn;
    }
  }

  const open = (): void => {
    overlay.classList.add('visible');
    onOpen?.();
  };

  const close = (): void => {
    overlay.classList.remove('visible');
    onClose?.();
  };

  const isOpen = (): boolean => {
    return overlay.classList.contains('visible');
  };

  const setTitle = (newTitle: string): void => {
    if (titleSpan) {
      titleSpan.textContent = newTitle;
    }
  };

  // Close button handler
  if (closeButton) {
    closeButton.addEventListener('click', close);
  }

  // Backdrop click handler
  if (dismissOnBackdrop) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
      }
    });
  }

  // Escape key handler (uses document-level listener with visibility check)
  if (dismissOnEscape) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) {
        close();
      }
    });
  }

  return { open, close, isOpen, setTitle };
}
