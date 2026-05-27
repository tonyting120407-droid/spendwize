export const CATEGORIES = ['Food','Groceries','Transportation','Rent','Bills','Entertainment','Electronics','Income','Other Income','Other']
export const EXPENSE_CATEGORIES = ['Food','Groceries','Transportation','Rent','Bills','Entertainment','Electronics','Other']
export const PAYMENT_METHODS = ['cash','debit','credit','other']
export const DEFAULT_SETTINGS = { currency: 'USD', monthlyIncome: 2500, taxEstimate: 15, rent: 900, bills: 140, otherFixedCosts: 120 }
export const DEFAULT_BUDGETS = {
  dailyLimit: 50, monthlyLimit: 1400, savingsGoal: 500,
  categoryBudgets: { Food: 250, Groceries: 250, Transportation: 150, Rent: 900, Bills: 180, Entertainment: 120, Electronics: 150, Other: 120 },
}
export const DEFAULT_CREDIT_CARD = { limit: 2000, currentBalance: 350, dueDate: '' }
