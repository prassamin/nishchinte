"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { actions } from "@nishchinte/server/actions";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "@nishchinte/server/actions";

type ProductMutationParams = {
  onSuccess?: () => void;
};

export function useCreateProductMutation({
  onSuccess,
}: ProductMutationParams = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const res = await actions.product.create(data);
      if (!res.ok) throw new Error(res.error || "Failed to create product");
      return res.product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast("Success", {
        description: "Product created successfully",
        variant: "success",
      });
      onSuccess?.();
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Could not create product",
        variant: "danger",
      });
    },
  });
}

export function useUpdateProductMutation({
  onSuccess,
}: ProductMutationParams = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      data,
    }: {
      productId: string;
      data: UpdateProductInput;
    }) => {
      const res = await actions.product.update(productId, data);
      if (!res.ok) throw new Error(res.error || "Failed to update product");
      return res.product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product"] });
      toast("Success", {
        description: "Product updated successfully",
        variant: "success",
      });
      onSuccess?.();
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Could not update product",
        variant: "danger",
      });
    },
  });
}
