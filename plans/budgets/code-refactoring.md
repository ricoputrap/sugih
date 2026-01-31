# Budgets: Code Refactoring

## 1. Page Component

Make sure `<BudgetsPage />` component file (src/app/budgets/page.tsx) contains only the page component itself. Other components should be written in separated component files. If the components are used only in this Budgets page, put the component files in `src/modules/Budget/components` directory. Otherwise, if the components are reusable, put the files in `src/components/shared`.

If there are tests for the components, make sure they are written in the corresponding component files.

For example, for the `<BudgetsPageSkeleton />` component, create a new file `src/modules/Budget/components/BudgetsPageSkeleton.tsx` and write the component code there. If there are tests for this component, create a new file `src/modules/Budget/components/BudgetsPageSkeleton.test.tsx` and write the tests there.

Do not flag all components with "use_client" except if they are really using client-side features. However, do not write any react server component.

## 2. 