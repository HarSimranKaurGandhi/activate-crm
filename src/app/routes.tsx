import { QuotePayments } from './pages/QuotePayments';
import { QuickReplyMaster } from './pages/masters/QuickReplyMaster';
import { InfluencerTypeMaster } from './pages/masters/InfluencerTypeMaster';
import { SparePartRequestsPage } from './pages/SparePartRequestsPage';
import { createBrowserRouter } from "react-router";
import { PrivateRoute } from "./auth/PrivateRoute";
import { AdminRoute } from "./auth/AdminRoute";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { QuotationList, OrderFulfillment } from "./pages/QuotationList";
import { QuotationBuilder } from "./pages/QuotationBuilder";
import { QuotationPreview } from "./pages/QuotationPreview";
import { QuotationApprovals } from "./pages/QuotationApprovals";
import { CustomerList } from "./pages/CustomerList";
import { CustomerForm } from "./pages/CustomerForm";
import { ProductList } from "./pages/ProductList";
import { ProductForm } from "./pages/ProductForm";
import { InventoryThresholds } from "./pages/InventoryThresholds";
import { Inventory } from "./pages/Inventory";
import { InventoryMovement } from "./pages/InventoryMovement";
import { InventoryLog } from "./pages/InventoryLog";
import { DispatchList } from "./pages/DispatchList";
import { DispatchForm } from "./pages/DispatchForm";
import { DispatchView } from "./pages/DispatchView";
import { BillingPayments } from "./pages/BillingPayments";
import { TaxInvoiceForm } from "./pages/TaxInvoiceForm";
import { TaxInvoiceView } from "./pages/TaxInvoiceView";
import { TaskList } from "./pages/TaskList";
import { TaskForm } from "./pages/TaskForm";
import { TaskView } from "./pages/TaskView";
import { LeadList } from "./pages/LeadList";
import { LeadForm } from "./pages/LeadForm";
import { LeadView } from "./pages/LeadView";
import { InfluencerPortal } from "./pages/InfluencerPortal";
import { InfluencerList } from "./pages/InfluencerList";
import { CategoryMaster } from "./pages/masters/CategoryMaster";
import { TagMaster } from "./pages/masters/TagMaster";
import { BrandMaster } from "./pages/masters/BrandMaster";
import { AdjustmentMaster } from "./pages/masters/AdjustmentMaster";
import { TermsMaster } from "./pages/masters/TermsMaster";
import { CustomFieldBuilder } from "./pages/masters/CustomFieldBuilder";
import { OemMaster } from "./pages/masters/OemMaster";
import { UserMaster } from "./pages/masters/UserMaster";
import { GodownMaster } from "./pages/masters/GodownMaster";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { ServicePayments } from "./pages/ServicePayments";
import { ServiceCalendar } from "./pages/ServiceCalendar";
import { ServiceDashboard } from "./pages/ServiceDashboard";
import { ServiceRequestForm } from "./pages/ServiceRequestForm";
import { AmcForm } from "./pages/AmcForm";
import { Login } from "./pages/Login";
import { AppProviders } from "./components/AppProviders";

export const router = createBrowserRouter([
  {
    Component: AppProviders,
    children: [
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
              { path: "order-fulfillment", Component: OrderFulfillment },
              { path: "quotations/new", Component: QuotationBuilder },
              { path: "quotations/:id/edit", Component: QuotationBuilder },
              { path: "quotations/:id/preview", Component: QuotationPreview },
              { path: "quotations/approvals", Component: QuotationApprovals },
              { path: "customers", Component: CustomerList },
              { path: "customers/new", Component: CustomerForm },
              { path: "customers/:id/edit", Component: CustomerForm },
              { path: "tasks", Component: TaskList },
              { path: "tasks/new", Component: TaskForm },
              { path: "tasks/:id", Component: TaskView },
              { path: "tasks/:id/edit", Component: TaskForm },
              { path: "leads", Component: LeadList },
              { path: "leads/new", Component: LeadForm },
              { path: "leads/:id", Component: LeadView },
              { path: "leads/:id/edit", Component: LeadForm },
              { path: "influencer/leads", Component: InfluencerPortal },
              { path: "influencers", Component: InfluencerList },
              { path: "products", Component: ProductList },
              { path: "products/new", Component: ProductForm },
              { path: "products/:id/edit", Component: ProductForm },
              { path: "inventory", Component: Inventory },
              { path: "inventory/thresholds", Component: InventoryThresholds },
              { path: "inventory/log", Component: InventoryLog },
              { path: "inventory/movement/:type", Component: InventoryMovement },
              { path: "dispatches", Component: DispatchList },
              { path: "dispatches/new", Component: DispatchForm },
              { path: "dispatches/:id", Component: DispatchView },
              { path: "dispatches/:id/edit", Component: DispatchForm },
              { path: "billing", Component: BillingPayments },
              { path: "billing/payments", Component: QuotePayments },
              { path: "billing/invoices/new", Component: DispatchForm },
              { path: "billing/dispatches/:id/convert", Component: TaxInvoiceForm },
              { path: "billing/invoices/:id", Component: TaxInvoiceView },
              { path: "services", Component: ServiceDashboard },
              { path: "services/calendar", Component: ServiceCalendar },
              { path: "services/payments", Component: ServicePayments },
              { path: "services/spare-part-requests", Component: SparePartRequestsPage },
              { path: "services/new", Component: ServiceRequestForm },
              { path: "services/amcs/new", Component: AmcForm },
              { path: "services/amcs/:id/edit", Component: AmcForm },
              { path: "masters/categories", Component: CategoryMaster },
              { path: "masters/tags", Component: TagMaster },
              { path: "masters/quick-replies", Component: QuickReplyMaster },
              { path: "masters/influencer-types", Component: InfluencerTypeMaster },
              { path: "masters/brands", Component: BrandMaster },
              { path: "masters/terms", Component: TermsMaster },
              { path: "masters/godowns", Component: GodownMaster },
            ],
          },
        ],
      },
      {
        Component: AdminRoute,
        children: [
          {
            path: "/",
            Component: Layout,
            children: [
              { path: "masters/users", Component: UserMaster },
              { path: "masters/oems", Component: OemMaster },
              { path: "masters/adjustments", Component: AdjustmentMaster },
              { path: "masters/custom-fields", Component: CustomFieldBuilder },
              { path: "reports", Component: Reports },
              { path: "settings", Component: Settings },
            ],
          },
        ],
      },
    ],
  },
]);
