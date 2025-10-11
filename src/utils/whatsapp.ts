/**
 * Utility functions for WhatsApp integration
 */

/**
 * Opens WhatsApp chat with the given phone number
 * @param phoneNumber - The phone number (with or without country code)
 * @param message - Optional pre-filled message
 */
export function openWhatsAppChat(phoneNumber: string, message?: string): void {
    // Clean the phone number - remove any non-digit characters except +
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '')

    // If the number doesn't start with +, assume it's a Pakistani number and add +92
    let formattedNumber = cleanNumber
    if (!cleanNumber.startsWith('+')) {
        // Remove leading 0 if present and add +92
        const withoutZero = cleanNumber.startsWith('0') ? cleanNumber.slice(1) : cleanNumber
        formattedNumber = `+92${withoutZero}`
    }

    // Encode the message for URL
    const encodedMessage = message ? encodeURIComponent(message) : ''

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedNumber.replace('+', '')}${encodedMessage ? `?text=${encodedMessage}` : ''}`

    // Open in new tab
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
}

/**
 * Formats a phone number for display
 * @param phoneNumber - The phone number to format
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(phoneNumber: string): string {
    const cleanNumber = phoneNumber.replace(/[^\d]/g, '')

    // Pakistani number formatting
    if (cleanNumber.length === 11 && cleanNumber.startsWith('0')) {
        // Format: 03XX XXX XXXX
        return `${cleanNumber.slice(0, 4)} ${cleanNumber.slice(4, 7)} ${cleanNumber.slice(7)}`
    } else if (cleanNumber.length === 10) {
        // Format: 3XX XXX XXXX
        return `${cleanNumber.slice(0, 3)} ${cleanNumber.slice(3, 6)} ${cleanNumber.slice(6)}`
    }

    return phoneNumber
}
