// API Endpoints organized by module

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Companies
  COMPANIES: {
    BASE: '/companies',
    BY_ID: (id: string) => `/companies/${id}`,
    CURRENT: '/companies/current',
    PROFILE: '/companies/profile',
    SETTINGS: '/companies/settings',
  },

  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    PROFILE: '/users/profile',
  },

  // Subscriptions
  SUBSCRIPTIONS: {
    BASE: '/subscriptions',
    BY_ID: (id: string) => `/subscriptions/${id}`,
    CURRENT: '/subscriptions/current',
    PLANS: '/subscriptions/plans',
    HISTORY: '/subscriptions/history',
    RENEW: (id: string) => `/subscriptions/${id}/renew`,
    CANCEL: (id: string) => `/subscriptions/${id}/cancel`,
    REACTIVATE: (id: string) => `/subscriptions/${id}/reactivate`,
  },

  // Products
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id: string) => `/products/${id}`,
    CATEGORIES: '/products/categories',
  },

  // Categories
  CATEGORIES: {
    BASE: '/categories',
    BY_ID: (id: string) => `/categories/${id}`,
    TREE: '/categories/tree',
  },

  // Customers
  CUSTOMERS: {
    BASE: '/customers',
    BY_ID: (id: string) => `/customers/${id}`,
    PURCHASE_HISTORY: (id: string) => `/customers/${id}/purchase-history`,
    LOYALTY_HISTORY: (id: string) => `/customers/${id}/loyalty-history`,
    ADD_POINTS: '/customers/loyalty/add-points',
    REDEEM_POINTS: '/customers/loyalty/redeem-points',
    POINTS_VALUE: (points: number) => `/customers/loyalty/points-value/${points}`,
  },

  // Transactions
  TRANSACTIONS: {
    BASE: '/transactions',
    BY_ID: (id: string) => `/transactions/${id}`,
    SUMMARY: '/transactions/summary',
  },

  // Billing
  BILLING: {
    BASE: '/billing',
    INVOICES: '/billing/invoices',
    INVOICE_BY_ID: (id: string) => `/billing/invoices/${id}`,
    INVOICE_PDF: (id: string) => `/billing/invoices/${id}/pdf`,
    PAYMENTS: '/billing/payments',
    PAYMENT_BY_ID: (id: string) => `/billing/payments/${id}`,
    CREATE_PAYMENT: '/billing/payments/create',
    WEBHOOK: '/billing/webhook',
  },

  // Reports
  REPORTS: {
    SALES: '/reports/sales',
    REVENUE: '/reports/revenue',
    PRODUCTS: '/reports/products',
    CUSTOMERS: '/reports/customers',
    INVENTORY: '/reports/inventory',
    DASHBOARD: '/reports/dashboard',
  },

  // Shifts
  SHIFTS: {
    BASE: '/shifts',
    BY_ID: (id: string) => `/shifts/${id}`,
    CURRENT: '/shifts/current',
    OPEN: '/shifts/open',
    CLOSE: (id: string) => `/shifts/${id}/close`,
  },

  // Notifications
  NOTIFICATIONS: {
    BASE: '/notifications',
    BY_ID: (id: string) => `/notifications/${id}`,
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },

  // Employees
  EMPLOYEES: {
    BASE: '/employees',
    BY_ID: (id: string) => `/employees/${id}`,
    CLOCK_IN: (id: string) => `/employees/${id}/clock-in`,
    CLOCK_OUT: (id: string) => `/employees/${id}/clock-out`,
    ATTENDANCE: (id: string) => `/employees/${id}/attendance`,
    CLOCK_IN_STATUS: (id: string) => `/employees/${id}/clock-in-status`,
    LINK_USER: (id: string) => `/employees/${id}/link-user`,
    CREATE_USER: (id: string) => `/employees/${id}/create-user`,
  },

  // Roles
  ROLES: {
    BASE: '/roles',
    BY_ID: (id: string) => `/roles/${id}`,
  },

  // Stores
  STORES: {
    BASE: '/stores',
    BY_ID: (id: string) => `/stores/${id}`,
    ASSIGN_MANAGER: (id: string) => `/stores/${id}/assign-manager`,
    REMOVE_MANAGER: (id: string) => `/stores/${id}/manager`,
    BY_MANAGER: (managerId: string) => `/stores/manager/${managerId}`,
    STATS: (id: string) => `/stores/${id}/stats`,
  },

  // Payment Methods
  PAYMENT_METHODS: {
    BASE: '/payment-methods',
    BY_ID: (id: string) => `/payment-methods/${id}`,
    TOGGLE: (id: string) => `/payment-methods/${id}/toggle`,
  },
};

export default API_ENDPOINTS;
