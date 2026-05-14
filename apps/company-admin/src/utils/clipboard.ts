/**
 * Copy text to clipboard with fallback for unsupported browsers
 * @param text Text to copy
 * @returns Promise<boolean> Success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern Clipboard API (preferred)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback method', err);
    }
  }

  // Method 2: Fallback using execCommand (deprecated but widely supported)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make it invisible
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('Fallback copy method failed', err);
    return false;
  }
}

/**
 * Copy text to clipboard and show toast notification
 * @param text Text to copy
 * @param successMessage Success message for toast
 * @param errorMessage Error message for toast
 */
export async function copyToClipboardWithToast(
  text: string,
  successMessage: string = 'Disalin ke clipboard!',
  errorMessage: string = 'Gagal menyalin. Silakan copy manual.'
): Promise<boolean> {
  const success = await copyToClipboard(text);
  
  if (success) {
    // Import toast dynamically to avoid circular dependency
    const { default: toast } = await import('react-hot-toast');
    toast.success(successMessage);
  } else {
    const { default: toast } = await import('react-hot-toast');
    toast.error(errorMessage);
  }
  
  return success;
}
