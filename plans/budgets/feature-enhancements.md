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
