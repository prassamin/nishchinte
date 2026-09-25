"use client";

import { useState, useEffect } from "react";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { getUpazilas, allDistricts } from "@nishchinte/bangladesh-address";
import { FormField } from "./components/form-field";
import { ReadOnlyField } from "./components/read-only-field";
import { Button, Spinner, toast } from "@heroui/react";
import Content from "../../components/content";

export type SettingFormData = {
  name: string;
  phone: string;
  email: string;
  district: string;
  upazila: string;
  area: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  invoicePrefix: string;
  orderPrefix: string;
  deliveryInsideDhaka: string;
  deliveryOutsideDhaka: string;
};

export function StoreSettingsView() {
  const [formData, setFormData] = useState<SettingFormData>({
    name: "",
    phone: "",
    email: "",
    district: "",
    upazila: "",
    area: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    invoicePrefix: "INV",
    orderPrefix: "ORD",
    deliveryInsideDhaka: "60",
    deliveryOutsideDhaka: "120",
  });
  const [loading, setLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      const res = {
        ok: true,
        settings: {
          store_name: "",
          store_phone: "",
          store_email: "",
          store_district: "",
          store_upazila: "",
          store_area: "",
          store_address_1: "",
          store_address_2: "",
          store_postal_code: "",
          invoice_prefix: "",
          order_prefix: "",
          delivery_inside_dhaka: "",
          delivery_outside_dhaka: "",
        },
      };
      if (res.ok && res.settings) {
        setFormData({
          name: res.settings.store_name || "",
          phone: res.settings.store_phone || "",
          email: res.settings.store_email || "",
          district: res.settings.store_district || "",
          upazila: res.settings.store_upazila || "",
          area: res.settings.store_area || "",
          addressLine1: res.settings.store_address_1 || "",
          addressLine2: res.settings.store_address_2 || "",
          postalCode: res.settings.store_postal_code || "",
          invoicePrefix: res.settings.invoice_prefix || "INV",
          orderPrefix: res.settings.order_prefix || "ORD",
          deliveryInsideDhaka: res.settings.delivery_inside_dhaka || "60",
          deliveryOutsideDhaka: res.settings.delivery_outside_dhaka || "120",
        });
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const upazilas = formData.district ? getUpazilas(formData.district) : [];

  function handleChange(field: keyof SettingFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Store name is required";
    }

    if (formData.phone.trim()) {
      try {
        const parsed = parsePhoneNumberWithError(formData.phone, "BD");
        if (!parsed || !parsed.isValid()) {
          errors.phone = "Please enter a valid Bangladeshi phone number";
        }
      } catch {
        errors.phone = "Please enter a valid Bangladeshi phone number";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = {
        ok: true,
        error: null,
        store_name: formData.name.trim(),
        store_phone: formData.phone.trim(),
        store_email: formData.email.trim(),
        store_district: formData.district.trim(),
        store_upazila: formData.upazila.trim(),
        store_area: formData.area.trim(),
        store_address_1: formData.addressLine1.trim(),
        store_address_2: formData.addressLine2.trim(),
        store_postal_code: formData.postalCode.trim(),
        invoice_prefix: formData.invoicePrefix.trim(),
        order_prefix: formData.orderPrefix.trim(),
        delivery_inside_dhaka: formData.deliveryInsideDhaka.trim(),
        delivery_outside_dhaka: formData.deliveryOutsideDhaka.trim(),
      };

      if (!res.ok) {
        throw new Error(res.error || "Failed to save settings");
      }

      toast.success("Store settings updated successfully");
    } catch (err: any) {
      toast.danger(err?.message || "Failed to update store settings");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Content>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner size="lg" className="text-ap-accent" />
          <p className="text-ap-muted text-sm">Loading store settings...</p>
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ap-foreground">
          Store Settings
        </h1>
        <p className="text-sm text-ap-muted">
          Manage your store information and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-ap-border/70 bg-ap-surface/80 p-5">
          <h2 className="text-lg font-semibold text-ap-foreground">
            Basic Information
          </h2>
          <p className="mt-1 text-sm text-ap-muted">
            Update store name, contact details and physical address.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <FormField
              label="Store Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={fieldErrors.name}
            />
            <ReadOnlyField label="Store Mode" value="Single Store (Direct)" />
            <FormField
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={fieldErrors.phone}
            />
            <FormField
              label="Support Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={fieldErrors.email}
            />
            <FormField
              label="District"
              name="district"
              type="select"
              value={formData.district}
              onChange={handleChange}
              options={allDistricts()}
            />
            <FormField
              label="Upazila / Thana"
              name="upazila"
              type="select"
              value={formData.upazila}
              onChange={handleChange}
              options={upazilas}
            />
            <FormField
              label="Area"
              name="area"
              value={formData.area}
              onChange={handleChange}
            />
            <FormField
              label="Postal Code"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
            />
            <div className="sm:col-span-2">
              <FormField
                label="Address Line 1"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
              />
            </div>
            <div className="sm:col-span-2">
              <FormField
                label="Address Line 2 (Optional)"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ap-border/70 bg-ap-surface/80 p-5">
          <h2 className="text-lg font-semibold text-ap-foreground">
            Document & Delivery Settings
          </h2>
          <p className="mt-1 text-sm text-ap-muted">
            Customize invoice prefixes, order prefixes and default delivery
            fees.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <FormField
              label="Invoice Prefix"
              name="invoicePrefix"
              value={formData.invoicePrefix}
              onChange={(f, v) => handleChange(f, v.toUpperCase())}
              error={fieldErrors.invoicePrefix}
            />
            <FormField
              label="Order Prefix"
              name="orderPrefix"
              value={formData.orderPrefix}
              onChange={(f, v) => handleChange(f, v.toUpperCase())}
              error={fieldErrors.orderPrefix}
            />
            <FormField
              label="Delivery Inside Dhaka (৳)"
              name="deliveryInsideDhaka"
              value={formData.deliveryInsideDhaka}
              onChange={handleChange}
            />
            <FormField
              label="Delivery Outside Dhaka (৳)"
              name="deliveryOutsideDhaka"
              value={formData.deliveryOutsideDhaka}
              onChange={handleChange}
            />
            <div className="sm:col-span-2">
              <Button
                type="submit"
                isDisabled={isSubmitting}
                isPending={isSubmitting}
                className="rounded-xl bg-ap-accent px-5 py-2.5 text-sm font-semibold text-ap-accent-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? <Spinner color="current" size="sm" /> : null}
                {isSubmitting ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Content>
  );
}
