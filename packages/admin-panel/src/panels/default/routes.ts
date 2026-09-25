import type { AdminRoute } from "../../registry/types";
import DashboardPage from "./pages/page";
import ProductsPage from "./pages/products/page";
import ContentPage from "./pages/content/page";
import ProductsCategoriesPage from "./pages/products/categories/page";
import ProductsDetailsCategoriesPage from "./pages/products/categories/[slug]/page";
import NewProductPage from "./pages/products/new/page";
import SettingsPage from "./pages/settings/page";
import TeamSettingsPage from "./pages/settings/team/page";
import SetupPage from "./pages/setup/page";
import SignInPage from "./pages/sign-in/page";
import OrdersPage from "./pages/orders/page";
import OrderPage from "./pages/orders/[orderId]/page";
import CouponsPage from "./pages/coupons/page";

/**
 * Default Admin Panel Routes
 * Place and register your default panel views in this array.
 */
export const defaultPanelRoutes: AdminRoute[] = [
  {
    path: "",
    component: DashboardPage,
  },
  {
    path: "/content",
    component: ContentPage,
  },
  {
    path: "/products",
    component: ProductsPage,
  },
  {
    path: "/products/categories",
    component: ProductsCategoriesPage,
  },
  {
    path: "/products/categories/*slug",
    component: ProductsDetailsCategoriesPage,
  },
  {
    path: "/products/new",
    component: NewProductPage,
  },
  {
    path: "/coupons",
    component: CouponsPage,
  },
  {
    path: "/settings",
    component: SettingsPage,
  },
  {
    path: "/settings/team",
    component: TeamSettingsPage,
  },
  {
    path: "/setup",
    component: SetupPage,
  },
  {
    path: "/sign-in",
    component: SignInPage,
  },
  {
    path: "/orders",
    component: OrdersPage,
  },
  {
    path: "/orders/:orderId",
    component: OrderPage as any,
  },
];
