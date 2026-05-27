export const CATEGORY_KEYWORDS = {
  Food: ['apple', 'lunch', 'dinner', 'coffee', 'burger', 'restaurant'],
  Groceries: ['milk', 'eggs', 'bread', 'fruit', 'vegetables', 'supermarket'],
  Transportation: ['bus', 'train', 'uber', 'taxi', 'gas', 'parking'],
  Rent: ['rent', 'apartment', 'housing'],
  Bills: ['electricity', 'water', 'internet', 'phone bill'],
  Entertainment: ['movie', 'game', 'netflix', 'concert'],
  Electronics: ['laptop', 'phone', 'charger', 'headphones'],
  Income: ['salary', 'wage', 'paycheck'],
  'Other Income': ['gift', 'lottery', 'bonus', 'allowance'],
}
export const autoCategorizeTransaction = (description='') => {
  const t = description.toLowerCase().trim()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => t.includes(k))) return category
  }
  return 'Other'
}
export const formatCurrency = (amount, currency='USD') => new Intl.NumberFormat('en-US',{style:'currency',currency}).format(Number(amount||0))
export const calculateCategoryTotals = (transactions=[]) => transactions.filter(t=>t.type==='expense').reduce((a,t)=>{a[t.category]=(a[t.category]||0)+t.amount;return a},{})
export const calculateDailySummary = (transactions, date) => {
  const day = transactions.filter((t) => t.date === date)
  const income = day.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
  const expenses = day.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
  return { income, expenses, net: income-expenses, count: day.length, transactions: day }
}
export const calculateMonthlySummary = (transactions, settings, month) => {
  const monthTx = transactions.filter((t) => t.date.slice(0, 7) === month)
  const income = monthTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
  const expenses = monthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
  const fixedCosts = Number(settings.rent||0)+Number(settings.bills||0)+Number(settings.otherFixedCosts||0)
  const remaining = income-expenses-fixedCosts
  const afterTax = income*(1-Number(settings.taxEstimate||0)/100)
  return { monthTx, income, expenses, fixedCosts, remaining, savingsProgress: Math.max(afterTax-expenses-fixedCosts,0) }
}
export const calculateCreditCardUsage = (transactions, creditCardSettings) => {
  const creditTx = transactions.filter((t) => t.paymentMethod === 'credit' && t.type === 'expense')
  const spending = creditTx.reduce((s,t)=>s+t.amount,0)
  const used = Number(creditCardSettings.currentBalance||0)+spending
  const limit = Number(creditCardSettings.limit||0)
  const remaining = Math.max(limit-used,0)
  const utilization = limit ? (used/limit)*100 : 0
  return { creditTx, spending, used, limit, remaining, utilization }
}
export const generateBudgetWarnings = (summary, budgets) => {
  const warnings=[]
  if (summary.expenses > budgets.monthlyLimit) warnings.push('Monthly limit exceeded.')
  if (summary.expenses > budgets.monthlyLimit*0.85) warnings.push('Monthly spending near limit.')
  return warnings
}
