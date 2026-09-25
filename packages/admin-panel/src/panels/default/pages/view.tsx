"use client";

import Link from "next/link";
import { Boxes, ClipboardList, Plus, Settings } from "lucide-react";
import Content from "../components/content";
import { MetricCard } from "../components/metric-card";
import type { AdminSessionPayload } from "@nishchinte/auth";

interface DashboardMetrics {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalTeamMembers: number;
  recentOrders?: any[];
  lowStockProducts?: any[];
}

interface DashboardViewProps {
  user: AdminSessionPayload;
  metrics: DashboardMetrics;
}

export function DashboardView({ user, metrics }: DashboardViewProps) {
  return (
    <Content>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ap-foreground">
            Welcome back, {user.name || "Admin"}
          </h1>
          <p className="text-sm text-ap-muted">
            Role:{" "}
            <span className="font-semibold text-ap-accent">{user.role}</span> ·
            Here is an overview of your store.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-ap-accent px-4 py-2.5 text-sm font-semibold text-ap-accent-foreground hover:opacity-90 transition shadow-sm"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Products"
          value={String(metrics.totalProducts)}
          sub="Active catalog items"
        />
        <MetricCard
          title="Total Orders"
          value={String(metrics.totalOrders)}
          sub="Customer orders placed"
        />
        <MetricCard
          title="Total Customers"
          value={String(metrics.totalCustomers)}
          sub="Registered phone numbers"
        />
        <MetricCard
          title="Team & Staff"
          value={String(metrics.totalTeamMembers)}
          sub="Active admin users"
        />
      </div>

      {/* Quick Actions & Navigation */}
      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Quick Launch Card */}
        <div className="rounded-2xl border border-ap-border/80 bg-ap-surface/80 p-6 backdrop-blur-sm">
          <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
            <Boxes size={18} className="text-ap-accent" />
            <span>Product Catalog</span>
          </h2>
          <p className="mt-1 text-sm text-ap-muted">
            Manage your inventory, dynamic variations, and categories.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/products"
              className="rounded-lg border border-ap-border bg-ap-surface-secondary px-3 py-1.5 text-xs font-medium text-ap-foreground hover:bg-ap-accent/10 hover:text-ap-accent transition"
            >
              View All Products
            </Link>
            <Link
              href="/admin/products/categories"
              className="rounded-lg border border-ap-border bg-ap-surface-secondary px-3 py-1.5 text-xs font-medium text-ap-foreground hover:bg-ap-accent/10 hover:text-ap-accent transition"
            >
              Categories
            </Link>
            <Link
              href="/admin/products/new"
              className="rounded-lg border border-ap-accent/20 bg-ap-accent/10 px-3 py-1.5 text-xs font-medium text-ap-accent hover:bg-ap-accent/20 transition"
            >
              + Add New
            </Link>
          </div>
        </div>

        {/* Orders & Logistics Card */}
        <div className="rounded-2xl border border-ap-border/80 bg-ap-surface/80 p-6 backdrop-blur-sm">
          <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
            <ClipboardList size={18} className="text-ap-accent" />
            <span>Orders & Logistics</span>
          </h2>
          <p className="mt-1 text-sm text-ap-muted">
            Track customer orders, update statuses, and manage courier
            fulfillment.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/orders"
              className="rounded-lg border border-ap-border bg-ap-surface-secondary px-3 py-1.5 text-xs font-medium text-ap-foreground hover:bg-ap-accent/10 hover:text-ap-accent transition"
            >
              View Orders
            </Link>
            <Link
              href="/admin/content"
              className="rounded-lg border border-ap-border bg-ap-surface-secondary px-3 py-1.5 text-xs font-medium text-ap-foreground hover:bg-ap-accent/10 hover:text-ap-accent transition"
            >
              Media Gallery
            </Link>
          </div>
        </div>

        {/* Settings & Configuration Card */}
        <div className="rounded-2xl border border-ap-border/80 bg-ap-surface/80 p-6 backdrop-blur-sm">
          <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
            <Settings size={18} className="text-ap-accent" />
            <span>Settings & Team</span>
          </h2>
          <p className="mt-1 text-sm text-ap-muted">
            Configure courier APIs, payment gateways, delivery fees, and staff
            roles.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/settings"
              className="rounded-lg border border-ap-border bg-ap-surface-secondary px-3 py-1.5 text-xs font-medium text-ap-foreground hover:bg-ap-accent/10 hover:text-ap-accent transition"
            >
              Store Settings
            </Link>
            <Link
              href="/admin/settings/team"
              className="rounded-lg border border-ap-border bg-ap-surface-secondary px-3 py-1.5 text-xs font-medium text-ap-foreground hover:bg-ap-accent/10 hover:text-ap-accent transition"
            >
              Team Members
            </Link>
          </div>
        </div>
      </div>
    </Content>
  );
}
