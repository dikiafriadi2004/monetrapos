// Queue names
export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  SUBSCRIPTION: 'subscription',
  INVOICE: 'invoice',
} as const;

// Job names
export const JOB_NAMES = {
  // Email jobs
  SEND_WELCOME_EMAIL: 'send-welcome-email',
  SEND_INVOICE_EMAIL: 'send-invoice-email',
  SEND_RENEWAL_REMINDER: 'send-renewal-reminder',
  SEND_SUSPENSION_NOTICE: 'send-suspension-notice',
  SEND_VERIFICATION_EMAIL: 'send-verification-email',
  SEND_PASSWORD_RESET: 'send-password-reset',

  // Notification jobs
  SEND_NOTIFICATION: 'send-notification',
  SEND_BULK_NOTIFICATION: 'send-bulk-notification',

  // SMS jobs
  SEND_SMS: 'send-sms',
  SEND_OTP: 'send-otp',

  // WhatsApp jobs
  SEND_WHATSAPP: 'send-whatsapp',

  // Subscription jobs
  CHECK_EXPIRED_SUBSCRIPTIONS: 'check-expired-subscriptions',
  SEND_EXPIRY_REMINDERS: 'send-expiry-reminders',
  AUTO_SUSPEND_SUBSCRIPTIONS: 'auto-suspend-subscriptions',

  // Invoice jobs
  GENERATE_INVOICE_PDF: 'generate-invoice-pdf',
} as const;
