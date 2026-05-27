import { NavLink, Route, Routes } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  DEFAULT_BUDGETS,
  DEFAULT_CREDIT_CARD,
  DEFAULT_SETTINGS,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  CATEGORIES,
} from './utils/constants'
import {
  autoCategorizeTransaction,
  calculateCategoryTotals,
  calculateCreditCardUsage,
  calculateDailySummary,
  calculateMonthlySummary,
  formatCurrency,
  generateBudgetWarnings,
} from './utils/finance'

const COLORS = ['#4f46e5', '#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#84cc16', '#06b6d4', '#64748b']
const today = new Date().toISOString().slice(0, 10)

const sampleTransactions = [
  ['Coffee', 4.5, 'expense', 'Food', 'cash'],
  ['Apple', 3, 'expense', 'Groceries', 'debit'],
  ['Bus fare', 2.5, 'expense', 'Transportation', 'credit'],
  ['Salary', 2500, 'income', 'Income', 'debit'],
  ['Rent', 900, 'expense', 'Rent', 'debit'],
  ['Phone bill', 40, 'expense', 'Bills', 'credit'],
].map((s, i) => ({
  id: `${Date.now()}-${i}`,
  description: s[0],
  amount: s[1],
  type: s[2],
  category: s[3],
  paymentMethod: s[4],
  date: today,
  createdAt: new Date(Date.now() + i).toISOString(),
}))

function useLocalStorageState(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  })

  const save = (next) => {
    setValue(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  return [value, save]
}

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

function Card({ title, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      {title && <h3 className="font-semibold mb-3">{title}</h3>}
      {children}
    </section>
  )
}

export default function App() {
  const [transactions, setTransactions] = useLocalStorageState('sw_transactions', sampleTransactions)
  const [settings, setSettings] = useLocalStorageState('sw_settings', DEFAULT_SETTINGS)
  const [budgets, setBudgets] = useLocalStorageState('sw_budgets', DEFAULT_BUDGETS)
  const [creditCard, setCreditCard] = useLocalStorageState('sw_credit', DEFAULT_CREDIT_CARD)

  const saveTransaction = (tx) => {
    if (tx.id) {
      setTransactions(transactions.map((t) => (t.id === tx.id ? tx : t)))
      return
    }

    setTransactions([{ ...tx, id: uid(), createdAt: new Date().toISOString() }, ...transactions])
  }

  const removeTransaction = (id) => setTransactions(transactions.filter((t) => t.id !== id))

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-6xl mx-auto p-3 flex gap-2 overflow-x-auto">
          {[
            ['/', 'Home'],
            ['/add', 'Add Transaction'],
            ['/daily', 'Daily'],
            ['/monthly', 'Monthly'],
            ['/credit', 'Credit Card'],
            ['/goals', 'Goals'],
            ['/settings', 'Settings'],
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm whitespace-nowrap ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add" element={<Add transactions={transactions} onSave={saveTransaction} onDelete={removeTransaction} />} />
          <Route path="/daily" element={<Daily transactions={transactions} settings={settings} />} />
          <Route path="/monthly" element={<Monthly transactions={transactions} settings={settings} budgets={budgets} />} />
          <Route
            path="/credit"
            element={<Credit transactions={transactions} settings={settings} creditCard={creditCard} setCreditCard={setCreditCard} />}
          />
          <Route path="/goals" element={<Goals budgets={budgets} setBudgets={setBudgets} transactions={transactions} settings={settings} />} />
          <Route path="/settings" element={<Settings settings={settings} setSettings={setSettings} />} />
        </Routes>
      </main>
    </div>
  )
}

function Home() {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">SpendWise</h1>
      <p className="text-slate-600">Track spending instantly. Understand your money clearly.</p>
      <p>Log money movements in seconds, get automatic categories, monitor limits, and keep everything private in your browser.</p>
      <NavLink to="/add" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg">
        Start Tracking
      </NavLink>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Fast expense entry', 'Auto-categorized purchases', 'Budget warnings', 'Monthly financial overview'].map((x) => (
          <Card key={x} title={x}>
            <p className="text-sm text-slate-600">Focused tools designed for mobile and desktop.</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Add({ transactions, onSave, onDelete }) {
  const empty = { amount: '', description: '', type: 'expense', date: today, paymentMethod: 'cash', category: 'Other' }
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState('')

  const onDescriptionChange = (value) => {
    setForm((curr) => ({ ...curr, description: value, category: autoCategorizeTransaction(value) }))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    onSave({ ...form, amount: Number(form.amount), id: editingId || undefined })
    setForm(empty)
    setEditingId('')
  }

  const edit = (tx) => {
    setEditingId(tx.id)
    setForm({ ...tx })
  }

  return (
    <div className="space-y-4">
      <Card title="Add Transaction">
        <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-3">
          <input type="number" min="0" step="0.01" required className="border rounded-lg p-2" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount" />
          <input type="text" required className="border rounded-lg p-2" value={form.description} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Description" />
          <input type="date" required className="border rounded-lg p-2" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input type="text" required className="border rounded-lg p-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" />
          <select className="border rounded-lg p-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <select className="border rounded-lg p-2" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button className="sm:col-span-2 bg-indigo-600 text-white rounded-lg p-2">{editingId ? 'Update' : 'Save'} Transaction</button>
        </form>
      </Card>

      <Card title="Recent Transactions">
        {transactions.slice(0, 8).map((t) => (
          <div key={t.id} className="flex justify-between py-2 border-b text-sm gap-2">
            <span>{t.description} ({t.category})</span>
            <span>
              {t.type === 'expense' ? '-' : '+'}{t.amount.toFixed(2)}
              <button onClick={() => edit(t)} className="text-indigo-600 ml-2">Edit</button>
              <button onClick={() => onDelete(t.id)} className="text-rose-600 ml-2">Delete</button>
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}

function Daily({ transactions, settings }) { /* unchanged patterns */
  const [date, setDate] = useState(today)
  const [cat, setCat] = useState('all')
  const [pay, setPay] = useState('all')
  const summary = calculateDailySummary(transactions, date)
  const filtered = summary.transactions.filter((t) => (cat === 'all' || t.category === cat) && (pay === 'all' || t.paymentMethod === pay))
  const catData = Object.entries(calculateCategoryTotals(filtered)).map(([name, value]) => ({ name, value }))
  return <div className='space-y-4'><input type='date' value={date} onChange={(e)=>setDate(e.target.value)} className='border rounded-lg p-2' /><div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>{[['Daily income',summary.income],['Daily expenses',summary.expenses],['Net balance',summary.net],['Transactions',summary.count]].map(([k,v])=><Card key={k} title={k}>{typeof v === 'number' ? formatCurrency(v, settings.currency) : v}</Card>)}</div><div className='flex gap-2'><select onChange={(e)=>setCat(e.target.value)} className='border p-2 rounded'><option value='all'>All categories</option>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select><select onChange={(e)=>setPay(e.target.value)} className='border p-2 rounded'><option value='all'>All payment methods</option>{PAYMENT_METHODS.map(x=><option key={x}>{x}</option>)}</select></div><Card title='Category breakdown'>{catData.length ? <div className='h-72'><ResponsiveContainer><PieChart><Pie data={catData} dataKey='value' nameKey='name'>{catData.map((_,i)=><Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : 'No data'}</Card></div>
}

function Monthly({ transactions, settings, budgets }) {
  const [month, setMonth] = useState(today.slice(0, 7))
  const summary = calculateMonthlySummary(transactions, settings, month)
  const category = Object.entries(calculateCategoryTotals(summary.monthTx)).map(([name, value]) => ({ name, value }))
  const daily = Object.entries(summary.monthTx.filter((t) => t.type === 'expense').reduce((acc, t) => { acc[t.date] = (acc[t.date] || 0) + t.amount; return acc }, {})).map(([date, amount]) => ({ date: date.slice(8), amount }))
  const warnings = generateBudgetWarnings(summary, budgets)

  return <div className='space-y-4'><input type='month' value={month} onChange={(e)=>setMonth(e.target.value)} className='border rounded-lg p-2' /><div className='grid sm:grid-cols-2 lg:grid-cols-5 gap-3'>{[['Monthly income',summary.income],['Monthly expenses',summary.expenses],['Fixed costs',summary.fixedCosts],['Remaining money',summary.remaining],['Savings progress',summary.savingsProgress]].map(([k,v])=><Card key={k} title={k}>{formatCurrency(v,settings.currency)}</Card>)}</div><div className='grid lg:grid-cols-2 gap-3'><Card title='Spending by category'><div className='h-64'><ResponsiveContainer><BarChart data={category}><XAxis dataKey='name' /><YAxis /><Tooltip /><Bar dataKey='value' fill='#4f46e5' /></BarChart></ResponsiveContainer></div></Card><Card title='Daily spending'><div className='h-64'><ResponsiveContainer><BarChart data={daily}><XAxis dataKey='date' /><YAxis /><Tooltip /><Bar dataKey='amount' fill='#0ea5e9' /></BarChart></ResponsiveContainer></div></Card></div><Card title='Largest expenses'>{summary.monthTx.filter((t)=>t.type==='expense').sort((a,b)=>b.amount-a.amount).slice(0,5).map((t)=><div key={t.id} className='text-sm py-1'>{t.description}: {formatCurrency(t.amount, settings.currency)}</div>)}</Card>{warnings.map((w)=><div key={w} className='bg-amber-100 border border-amber-300 rounded-lg p-3'>{w}</div>)}</div>
}

function Credit({ transactions, settings, creditCard, setCreditCard }) {
  const usage = calculateCreditCardUsage(transactions, creditCard)
  const month = useMemo(() => today.slice(0, 7), [])
  const monthly = calculateMonthlySummary(transactions, settings, month)

  return <div className='space-y-4'><Card title='Credit Card Settings'><div className='grid sm:grid-cols-3 gap-3'>{[['limit','number'],['currentBalance','number'],['dueDate','date']].map(([k,t])=><input key={k} type={t} className='border rounded-lg p-2' value={creditCard[k] ?? ''} onChange={(e)=>setCreditCard({...creditCard,[k]:e.target.value})} />)}</div></Card><div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-3'>{[['Credit limit',usage.limit],['Used amount',usage.used],['Remaining credit',usage.remaining],['Utilization %',usage.utilization]].map(([k,v])=><Card key={k} title={k}>{k.includes('%') ? `${v.toFixed(1)}%` : formatCurrency(v, settings.currency)}</Card>)}</div>{usage.utilization>70 && <div className='bg-rose-100 border border-rose-300 rounded-lg p-3'>Warning: utilization above 70%</div>}{usage.spending>monthly.remaining && <div className='bg-rose-100 border border-rose-300 rounded-lg p-3'>Warning: credit card spending is higher than remaining monthly income.</div>}<Card title='Credit card transactions'>{usage.creditTx.map((t)=><div key={t.id} className='py-1 text-sm'>{t.date} — {t.description} ({formatCurrency(t.amount, settings.currency)})</div>)}</Card></div>
}

function Goals({ budgets, setBudgets, transactions, settings }) {
  const month = today.slice(0, 7)
  const summary = calculateMonthlySummary(transactions, settings, month)

  return <div className='space-y-4'><Card title='Goals and Budgets'><div className='grid sm:grid-cols-2 gap-3'>{[['dailyLimit','Daily spending limit'],['monthlyLimit','Monthly spending limit'],['savingsGoal','Savings goal']].map(([k,l])=><label key={k} className='text-sm'>{l}<input type='number' className='w-full border p-2 rounded mt-1' value={budgets[k]} onChange={(e)=>setBudgets({...budgets,[k]:Number(e.target.value)})} /></label>)}</div><div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4'>{EXPENSE_CATEGORIES.map((c)=><label key={c} className='text-sm'>{c}<input type='number' className='w-full border p-2 rounded mt-1' value={budgets.categoryBudgets[c]} onChange={(e)=>setBudgets({...budgets,categoryBudgets:{...budgets.categoryBudgets,[c]:Number(e.target.value)}})} /></label>)}</div></Card><Card title='Budget progress'>{Object.entries(budgets.categoryBudgets).map(([c,b])=>{const spent=transactions.filter((t)=>t.type==='expense'&&t.category===c&&t.date.startsWith(month)).reduce((a,t)=>a+t.amount,0);const pct=b ? Math.min((spent/b)*100,100):0;return <div key={c} className='mb-2'><div className='flex justify-between text-sm'><span>{c}</span><span>{formatCurrency(spent,settings.currency)} / {formatCurrency(b,settings.currency)}</span></div><div className='h-2 bg-slate-200 rounded'><div className={`h-2 rounded ${pct >= 100 ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{width:`${Math.min(pct,100)}%`}} /></div></div>})}</Card>{summary.expenses>budgets.monthlyLimit && <div className='bg-rose-100 border border-rose-300 rounded-lg p-3'>Monthly spending above configured monthly limit.</div>}</div>
}

function Settings({ settings, setSettings }) {
  return <Card title='Settings'><div className='grid sm:grid-cols-2 gap-3'>{[['currency','text'],['monthlyIncome','number'],['taxEstimate','number'],['rent','number'],['bills','number'],['otherFixedCosts','number']].map(([k,t])=><label key={k} className='text-sm capitalize'>{k}<input type={t} className='w-full border p-2 rounded mt-1' value={settings[k]} onChange={(e)=>setSettings({...settings,[k]:t==='number' ? Number(e.target.value) : e.target.value})} /></label>)}</div><button className='mt-4 px-3 py-2 bg-rose-600 text-white rounded' onClick={()=>{localStorage.clear();window.location.reload()}}>Clear all data</button></Card>
}
