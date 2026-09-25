import { create } from "zustand";
import { CategoryForm } from "./components/types";

type CategoryUIState = {
  form: CategoryForm;
  baseForm: CategoryForm;
  isInitialized: boolean;
  isSeoTitleManuallyEdited: boolean;
  isSeoDescriptionManuallyEdited: boolean;
  isSeoImageManuallyEdited: boolean;
  isLinkModalOpen: boolean;
  productSearch: string;
  linkablesError: string | null;

  isImageSelectorOpen: boolean;
  isSeoImageSelectorOpen: boolean;

  setForm: (form: CategoryForm) => void;
  setBaseForm: (form: CategoryForm) => void;
  setInitialized: (value: boolean) => void;
  setSeoTitleManuallyEdited: (value: boolean) => void;
  setSeoDescriptionManuallyEdited: (value: boolean) => void;
  setSeoImageManuallyEdited: (value: boolean) => void;
  setLinkModalOpen: (value: boolean) => void;
  setProductSearch: (value: string) => void;
  setLinkablesError: (value: string | null) => void;
  setImageSelectorOpen: (value: boolean) => void;
  setSeoImageSelectorOpen: (value: boolean) => void;
  reset: () => void;
};

const initialForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  seoTitle: "",
  seoDescription: "",
  seoImageUrl: "",
  parentId: "",
};

export const useCategoryStore = create<CategoryUIState>((set) => ({
  form: initialForm,
  baseForm: initialForm,
  isInitialized: false,
  isSeoTitleManuallyEdited: false,
  isSeoDescriptionManuallyEdited: false,
  isSeoImageManuallyEdited: false,
  isLinkModalOpen: false,
  productSearch: "",
  linkablesError: null,
  isImageSelectorOpen: false,
  isSeoImageSelectorOpen: false,

  setForm: (form) => set({ form }),
  setBaseForm: (baseForm) => set({ baseForm }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  setSeoTitleManuallyEdited: (isSeoTitleManuallyEdited) =>
    set({ isSeoTitleManuallyEdited }),
  setSeoDescriptionManuallyEdited: (isSeoDescriptionManuallyEdited) =>
    set({ isSeoDescriptionManuallyEdited }),
  setSeoImageManuallyEdited: (isSeoImageManuallyEdited) =>
    set({ isSeoImageManuallyEdited }),
  setLinkModalOpen: (isLinkModalOpen) => set({ isLinkModalOpen }),
  setProductSearch: (productSearch) => set({ productSearch }),
  setLinkablesError: (linkablesError) => set({ linkablesError }),
  setImageSelectorOpen: (isImageSelectorOpen) => set({ isImageSelectorOpen }),
  setSeoImageSelectorOpen: (isSeoImageSelectorOpen) =>
    set({ isSeoImageSelectorOpen }),

  reset: () =>
    set({
      form: initialForm,
      baseForm: initialForm,
      isInitialized: false,
      isSeoTitleManuallyEdited: false,
      isSeoDescriptionManuallyEdited: false,
      isSeoImageManuallyEdited: false,
      isLinkModalOpen: false,
      productSearch: "",
      linkablesError: null,
      isImageSelectorOpen: false,
      isSeoImageSelectorOpen: false,
    }),
}));
