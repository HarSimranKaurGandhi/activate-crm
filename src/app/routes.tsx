import { createBrowserRouter } from "react-router";
import { PrivateRoute } from "./auth/PrivateRoute";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { QuotationList } from "./pages/QuotationList";
import { QuotationBuilder } from "./pages/QuotationBuilder";
import { QuotationPreview } from "./pages/QuotationPreview";
import { CustomerList } from "./pages/CustomerList";
import { CustomerForm } from "./pages/CustomerForm";
import { ProductList } from "./pages/ProductList";
import { ProductForm } from "./pages/ProductForm";
import { CategoryMaster } from "./pages/masters/CategoryMaster";
import { BrandMaster } from "./pages/masters/BrandMaster";
import { AdjustmentMaster } from "./pages/masters/AdjustmentMaster";
import { TermsMaster } from "./pages/masters/TermsMaster";
import { CustomFieldBuilder } from "./pages/masters/CustomFieldBuilder";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    Component: PrivateRoute,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "quotations", Component: QuotationList },
          { path: "quotations/new", Component: QuotationBuilder },
          { path: "quotations/:id/edit", Component: QuotationBuilder },
          { path: "quotations/:id/preview", Component: QuotationPreview },
          { path: "customers", Component: CustomerList },
          { path: "customers/new", Component: CustomerForm },
          { path: "customers/:id/edit", Component: CustomerForm },
          { path: "products", Component: ProductList },
          { path: "products/new", Component: ProductForm },
          { path: "products/:id/edit", Component: ProductForm },
          { path: "masters/categories", Component: CategoryMaster },
          { path: "masters/brands", Component: BrandMaster },
          { path: "masters/adjustments", Component: AdjustmentMaster },
          { path: "masters/terms", Component: TermsMaster },
          { path: "masters/custom-fields", Component: CustomFieldBuilder },
          { path: "reports", Component: Reports },
          { path: "settings", Component: Settings },
        ],
      },
    ],
  },
]);
