# Budgets: Feature Enhancements

## 1. Month Selection - DONE

Currently, the month selection is supported only by selecting the month from the dropdown menu. I want to be able to select the previous or next month by clicking on the arrows. However, we should keep the dropdown menu as today. Therefore, the month selection is faciliated by 3 approaches: prev btn, next btn, and month dropdown menu.

## 2. Usage Percentage in List View - DONE

When "List View" is active, I don't want to see the usage percentage anymore in the budget table. The usage category (e.g. "Over Budget") is enough to indicate the status of the budget. Don't change anything in the "Grid View".

## 3. View Selector - DONE

The "List View" should be the default view. But I have an issue with the "Grid View". When I click on the "Grid View" icon button, the view correctly changes to "Grid View". However, when I click on the "Grid View" icon button again, the view changes back to "List View". This is bad. When I click on the "Grid View" multiple times, the view should keep displaying "Grid View". Same behavior should apply to the "List View" icon button.

## 4. Budget Table - DONE

1. Show 5 rows by default.
2. I should be able to set how many rows to show in the budget table by setting it in the pagination component (below the table).
3. I should be able to sort the table by clicking on the "Category", "Budget Amount", "Spent", and "Remaining" column headers.

## 5. Usage Category - DONE

- **Green Gradient** (0-79%): On track - Indicates healthy budget usage
- **Orange Gradient** (80-99%): Near limit - Warning that budget limit is approaching
- **Yellow Gradient** (100%): Reached limit - Indicates budget limit has been reached
- **Red Gradient** (>100%): Over budget - Alert that budget has been exceeded

## 6. Multiple Deletion [IN PROGRESS]

User should be able to delete multiple budgets at once by selecting them and clicking the delete button. Similar to what we have in the Transactions page (src: `src/app/transactions/page.tsx`). The user interfaces and backend functionalities should be updated accordingly.

## 7. Incorrect "Remaining" Column Value [TODO]

It seems all of my budgets are still displaying the initial budget amount instead of the remaining budget amount. This is incorrect. The remaining budget amount should be calculated as the difference between the budget amount and the spent amount. The "Spent" column is already displaying correctly. Focus on fixing the "Remaining" column value calculation. That's it.

## 8. Invalid Summary Calculation [TODO]

It seems the summary calculation data is fetched only once (when the page is initially opened). This is incorrect. The summary calculation data should be fetched every time the page is opened (including when the user moves to a different page and go back to the Budgets page). Ensure that the summary calculation data is fetched every time the page is opened.

## 9. Incorrect Row Data Calculation [TODO]

It seems the row data calculation is not being updated correctly. This is incorrect. The row data should be updated every time the page is opened (including when the user moves to a different page and go back to the Budgets page). Ensure that the row data is updated every time the page is opened.

## 10. Archiving Budgets [TODO]

User should be able to archive budgets by selecting them and clicking the archive button. However, direct hard deletion is still allowed. Not required to be archived before hard deletion.
