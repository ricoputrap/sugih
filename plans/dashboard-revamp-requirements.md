# Dashboard Revamp Requirements

## Purpose

The goal of this app is actually to help the user increase their net worth. Therefore, the dashboard should be designed to provide a clear and concise overview of the user's financial situation, including their income, expenses, and net worth.

## Components

### Top Section (Cards)

- Total Net Worth:
  - Title: "Total Net Worth"
  - Value: sum of all wallet balances + savings
  - Subtitle: growth rate over the last month (e.g. "10% more than last month")
- Money Left to Spend:
  - Title: "Money Left to Spend"
  - Value: this month's budget - this month's expenses
  - Subtitle: percentage of remaining budget (e.g. "50% of budget remaining")
- Total Spending:
  - Title: "Total Spending"
  - Value: sum of all expenses in this month
  - Subtitle: growth rate over the last month (e.g. "10% more than last month")
- Total Savings:
  - Title: "Total Savings"
  - Value: total savings all time
  - Subtitle: growth rate over the last month (e.g. "10% more than last month")

### Second Row: Financial Insights (Chart)

### Main Content (Chart)

In this container, the user can view various financial insights (line/area chart), such as their net worth growth, spending trends, and income growth. The user can select which trend they want to view by selecting from the tabs. Therefore, only 1 chart can be displayed at a time.

### Period Selector

On the top-right corner of the chart, a dropdown menu that allows the user to select the period:

- [Daily]: Showing days in the x-axis
- [Weekly]: Showing weeks in the x-axis
- [Monthly]: Showing months in the x-axis

### Date Range Selector

On the top-right corner of the chart, a dropdown menu that allows the user to select the date range:

- [Last Week]: Last week's data
- [This Month]: This month's data
- [Last Month]: Last month's data
- [Last 3 Months]: Last three months' data
- [Last 6 Months]: Last six months' data
- [This Year]: This year's data
- [Last Year]: Last year's data
- [All Time]: All time data

#### Content Chart A: Net Worth Growth

- Content (Default): A multiple-line chart showing the user's net worth over time. Every line represents the balance of every wallets and savings buckets.
- Content (Alternative): An area chart showing the user's net worth over time. Every area represents the balance of every wallets and savings buckets.

#### Content Chart B: Spending Trends

- Content (Default): A multiple-line chart showing the user's spending trends over time. Every line represents the amount spent in each category.
- Content (Alternative): An area chart showing the user's spending trends over time. Every area represents the amount spent in each category.

#### Content Chart C: Income Trends

- Content (Default): A multiple-line chart showing the user's income trends over time. Every line represents the amount earned in each category.
- Content (Alternative): An area chart showing the user's income trends over time. Every area represents the amount earned in each category.

#### Content Chart D: Savings Trends

- Content (Default): A multiple-line chart showing the user's savings trends over time. Every line represents the balance of every savings buckets.
- Content (Alternative): An area chart showing the user's savings trends over time. Every area represents the balance of every savings buckets.

### Third Row: Expense/Income Breakdown per Category and Latest Transactions

#### Expense/Income Breakdown per Category (Doughnut Chart)

In this section, we provide a doughnut chart that shows the user's expense/income breakdown per category. On the top-right corner, there are two dropdown menus that allow the user to filter the data by date range and category.

#### Latest Transactions (Table)

In this section, we provide a table that shows the user's latest 5 transactions. Each row represents a transaction, including the date, amount, type (expense/income/transfer/savings) and description.
