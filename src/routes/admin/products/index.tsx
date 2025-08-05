import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "~/components/Layout";
import { useAuthStore } from "~/stores/auth";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, X, Package, DollarSign, Tag, Settings, Calendar, Link, Unlink } from "lucide-react";

export const Route = createFileRoute("/admin/products/")({
  component: ProductsPage,
});

const productFormSchema = z.object({
  productCode: z.string().min(1, "Product code is required"),
  productName: z.string().min(1, "Product name is required"),
  productDesc: z.string().optional(),
  productType: z.enum(["Food", "Entry"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

const productTypeFormSchema = z.object({
  productSize: z.enum(["Adult", "Children", "Elder"]),
  productChoice: z.enum(["VEG", "NON-VEG", "NONE"]),
  productPref: z.enum(["CHICKEN", "MUTTON", "FISH", "NONE"]),
  productPrice: z.number().min(0, "Price must be non-negative"),
  productSubtype: z.enum(["PACKET", "DINE-IN", "NONE"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type ProductForm = z.infer<typeof productFormSchema>;
type ProductTypeForm = z.infer<typeof productTypeFormSchema>;

function ProductsPage() {
  const { token, user } = useAuthStore();
  const trpc = useTRPC();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isProductTypeModalOpen, setIsProductTypeModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingProductType, setEditingProductType] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSessionTagModalOpen, setIsSessionTagModalOpen] = useState(false);
  const [selectedProductForTagging, setSelectedProductForTagging] = useState<any>(null);

  const productsQuery = useQuery(
    trpc.getProducts.queryOptions({ authToken: token! })
  );

  const sessionsQuery = useQuery(
    trpc.getSessions.queryOptions({ authToken: token! })
  );

  const createProductMutation = useMutation(trpc.createProduct.mutationOptions({
    onSuccess: () => {
      toast.success("Product created successfully");
      setIsProductModalOpen(false);
      resetProduct();
      productsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create product");
    },
  }));

  const updateProductMutation = useMutation(trpc.updateProduct.mutationOptions({
    onSuccess: () => {
      toast.success("Product updated successfully");
      setIsProductModalOpen(false);
      setEditingProduct(null);
      resetProduct();
      productsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update product");
    },
  }));

  const deleteProductMutation = useMutation(trpc.deleteProduct.mutationOptions({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      productsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete product");
    },
  }));

  const createProductTypeMutation = useMutation(trpc.createProductType.mutationOptions({
    onSuccess: () => {
      toast.success("Product variation created successfully");
      setIsProductTypeModalOpen(false);
      setSelectedProduct(null);
      resetProductType();
      productsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create product variation");
    },
  }));

  const updateProductTypeMutation = useMutation(trpc.updateProductType.mutationOptions({
    onSuccess: () => {
      toast.success("Product variation updated successfully");
      setIsProductTypeModalOpen(false);
      setEditingProductType(null);
      resetProductType();
      productsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update product variation");
    },
  }));

  const deleteProductTypeMutation = useMutation(trpc.deleteProductType.mutationOptions({
    onSuccess: () => {
      toast.success("Product variation deleted successfully");
      productsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete product variation");
    },
  }));

  const addProductToSessionMutation = useMutation(trpc.addProductToSession.mutationOptions({
    onSuccess: () => {
      toast.success("Product tagged to session successfully");
      productsQuery.refetch();
      sessionsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to tag product to session");
    },
  }));

  const removeProductFromSessionMutation = useMutation(trpc.removeProductFromSession.mutationOptions({
    onSuccess: () => {
      toast.success("Product removed from session successfully");
      productsQuery.refetch();
      sessionsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove product from session");
    },
  }));

  const {
    register: registerProduct,
    handleSubmit: handleProductSubmit,
    formState: { errors: productErrors },
    reset: resetProduct,
    setValue: setProductValue,
  } = useForm<ProductForm>({
    resolver: zodResolver(productFormSchema),
  });

  const {
    register: registerProductType,
    handleSubmit: handleProductTypeSubmit,
    formState: { errors: productTypeErrors },
    reset: resetProductType,
    setValue: setProductTypeValue,
  } = useForm<ProductTypeForm>({
    resolver: zodResolver(productTypeFormSchema),
    defaultValues: {
      productChoice: "NONE",
      productPref: "NONE",
      productSubtype: "NONE",
      status: "ACTIVE"
    }
  });

  // Handle conditional rendering after all hooks are called
  if (!user || !token) {
    return (
      <Layout>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">Please log in to access this page.</p>
        </div>
      </Layout>
    );
  }

  const openCreateProductModal = () => {
    setEditingProduct(null);
    resetProduct();
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: any) => {
    setEditingProduct(product);
    setProductValue("productCode", product.productCode);
    setProductValue("productName", product.productName);
    setProductValue("productDesc", product.productDesc || "");
    setProductValue("productType", product.productType);
    setProductValue("status", product.status);
    setIsProductModalOpen(true);
  };

  const openCreateProductTypeModal = (product: any) => {
    setSelectedProduct(product);
    setEditingProductType(null);
    resetProductType();
    setIsProductTypeModalOpen(true);
  };

  const openEditProductTypeModal = (productType: any) => {
    // Find the full product object from the products query data
    const fullProduct = productsQuery.data?.find(p => p.id === productType.productId);
    
    setEditingProductType(productType);
    setSelectedProduct(fullProduct || { id: productType.productId });
    setProductTypeValue("productSize", productType.productSize);
    setProductTypeValue("productChoice", productType.productChoice);
    setProductTypeValue("productPref", productType.productPref);
    setProductTypeValue("productPrice", productType.productPrice);
    setProductTypeValue("productSubtype", productType.productSubtype);
    setProductTypeValue("status", productType.status);
    setIsProductTypeModalOpen(true);
  };

  const openSessionTagModal = (product: any) => {
    setSelectedProductForTagging(product);
    setIsSessionTagModalOpen(true);
  };

  const handleAddProductToSession = async (sessionId: number) => {
    if (!selectedProductForTagging) return;
    
    await addProductToSessionMutation.mutateAsync({
      authToken: token,
      productId: selectedProductForTagging.id,
      sessionId
    });
  };

  const handleRemoveProductFromSession = async (sessionId: number) => {
    if (!selectedProductForTagging) return;
    
    await removeProductFromSessionMutation.mutateAsync({
      authToken: token,
      productId: selectedProductForTagging.id,
      sessionId
    });
  };

  const onProductSubmit = async (data: ProductForm) => {
    try {
      if (editingProduct) {
        await updateProductMutation.mutateAsync({
          authToken: token,
          productId: editingProduct.id,
          ...data,
        });
      } else {
        await createProductMutation.mutateAsync({
          authToken: token,
          ...data,
        });
      }
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  const onProductTypeSubmit = async (data: ProductTypeForm) => {
    try {
      if (editingProductType) {
        await updateProductTypeMutation.mutateAsync({
          authToken: token,
          productTypeId: editingProductType.id,
          ...data,
        });
      } else {
        await createProductTypeMutation.mutateAsync({
          authToken: token,
          productId: selectedProduct.id,
          ...data,
        });
      }
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (window.confirm("Are you sure you want to delete this product? This will also delete all its variations.")) {
      await deleteProductMutation.mutateAsync({
        authToken: token,
        productId,
      });
    }
  };

  const handleDeleteProductType = async (productTypeId: number) => {
    if (window.confirm("Are you sure you want to delete this product variation?")) {
      await deleteProductTypeMutation.mutateAsync({
        authToken: token,
        productTypeId,
      });
    }
  };

  const getStatusColor = (status: string) => {
    return status === "ACTIVE" 
      ? "bg-green-100 text-green-800" 
      : "bg-red-100 text-red-800";
  };

  const getProductTypeLabel = (productType: any) => {
    const parts = [];
    if (productType.productSize !== "Adult") parts.push(productType.productSize);
    if (productType.productChoice !== "NONE") parts.push(productType.productChoice);
    if (productType.productPref !== "NONE") parts.push(productType.productPref);
    if (productType.productSubtype !== "NONE") parts.push(productType.productSubtype);
    return parts.length > 0 ? parts.join(", ") : "Standard";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          {user.role === "ADMIN" && (
            <button
              onClick={openCreateProductModal}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </button>
          )}
        </div>

        {productsQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading products...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {productsQuery.data?.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-red-600 mr-2" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{product.productName}</h3>
                      <p className="text-sm text-gray-500">{product.productCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                      {product.status}
                    </span>
                    {user.role === "ADMIN" && (
                      <>
                        <button
                          onClick={() => openEditProductModal(product)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Tag className="h-4 w-4 mr-2" />
                    <span>{product.productType}</span>
                  </div>

                  {product.productDesc && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Description:</p>
                      <p className="text-sm text-gray-600">{product.productDesc}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-700">Variations ({product.productTypes.length})</p>
                      {user.role === "ADMIN" && (
                        <button
                          onClick={() => openCreateProductTypeModal(product)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          <Plus className="h-4 w-4 inline mr-1" />
                          Add Variation
                        </button>
                      )}
                    </div>
                    
                    {product.productTypes.length > 0 ? (
                      <div className="space-y-2">
                        {product.productTypes.map((productType: any) => (
                          <div key={productType.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <div>
                              <p className="text-sm font-medium">{getProductTypeLabel(productType)}</p>
                              <p className="text-xs text-gray-500">{productType.productSize}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-right">
                                <p className="text-sm font-bold text-green-600">${productType.productPrice}</p>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(productType.status)}`}>
                                  {productType.status}
                                </span>
                              </div>
                              {user.role === "ADMIN" && (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => openEditProductTypeModal(productType)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProductType(productType.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No variations defined</p>
                    )}
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-700">Sessions ({product.productSessionMaps.length})</p>
                      {user.role === "ADMIN" && (
                        <button
                          onClick={() => openSessionTagModal(product)}
                          className="text-red-600 hover:text-red-900 text-sm flex items-center"
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Manage Sessions
                        </button>
                      )}
                    </div>
                    
                    {product.productSessionMaps.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.productSessionMaps.map((psm: any) => (
                          <span
                            key={psm.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            {psm.session.sessionName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Not tagged to any sessions</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {productsQuery.data?.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first product.</p>
            {user.role === "ADMIN" && (
              <button
                onClick={openCreateProductModal}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              >
                Add Product
              </button>
            )}
          </div>
        )}

        {/* Product Modal */}
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingProduct ? "Edit Product" : "Create Product"}
                </h3>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleProductSubmit(onProductSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Code *
                  </label>
                  <input
                    {...registerProduct("productCode")}
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter product code..."
                  />
                  {productErrors.productCode && (
                    <p className="mt-1 text-sm text-red-600">{productErrors.productCode.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Name *
                  </label>
                  <input
                    {...registerProduct("productName")}
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter product name..."
                  />
                  {productErrors.productName && (
                    <p className="mt-1 text-sm text-red-600">{productErrors.productName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Type *
                  </label>
                  <select
                    {...registerProduct("productType")}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select type...</option>
                    <option value="Food">Food</option>
                    <option value="Entry">Entry</option>
                  </select>
                  {productErrors.productType && (
                    <p className="mt-1 text-sm text-red-600">{productErrors.productType.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status *
                  </label>
                  <select
                    {...registerProduct("status")}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  {productErrors.status && (
                    <p className="mt-1 text-sm text-red-600">{productErrors.status.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    {...registerProduct("productDesc")}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter product description..."
                  />
                  {productErrors.productDesc && (
                    <p className="mt-1 text-sm text-red-600">{productErrors.productDesc.message}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                    className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {createProductMutation.isPending || updateProductMutation.isPending
                      ? "Saving..."
                      : editingProduct
                      ? "Update"
                      : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Product Type Modal */}
        {isProductTypeModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingProductType ? "Edit Product Variation" : "Add Product Variation"}
                </h3>
                <button
                  onClick={() => {
                    setIsProductTypeModalOpen(false);
                    setEditingProductType(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-700">Product: {selectedProduct?.productName}</p>
                <p className="text-xs text-gray-500">Code: {selectedProduct?.productCode}</p>
              </div>

              <form onSubmit={handleProductTypeSubmit(onProductTypeSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Size *
                  </label>
                  <select
                    {...registerProductType("productSize")}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="Adult">Adult</option>
                    <option value="Children">Children</option>
                    <option value="Elder">Elder</option>
                  </select>
                  {productTypeErrors.productSize && (
                    <p className="mt-1 text-sm text-red-600">{productTypeErrors.productSize.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Choice
                  </label>
                  <select
                    {...registerProductType("productChoice")}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="NONE">None</option>
                    <option value="VEG">Vegetarian</option>
                    <option value="NON-VEG">Non-Vegetarian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Preference
                  </label>
                  <select
                    {...registerProductType("productPref")}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="NONE">None</option>
                    <option value="CHICKEN">Chicken</option>
                    <option value="MUTTON">Mutton</option>
                    <option value="FISH">Fish</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Subtype
                  </label>
                  <select
                    {...registerProductType("productSubtype")}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="NONE">None</option>
                    <option value="PACKET">Packet</option>
                    <option value="DINE-IN">Dine-In</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price *
                  </label>
                  <input
                    {...registerProductType("productPrice", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="0.00"
                  />
                  {productTypeErrors.productPrice && (
                    <p className="mt-1 text-sm text-red-600">{productTypeErrors.productPrice.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status *
                  </label>
                  <select
                    {...registerProductType("status")}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProductTypeModalOpen(false);
                      setEditingProductType(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProductTypeMutation.isPending || updateProductTypeMutation.isPending}
                    className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {createProductTypeMutation.isPending || updateProductTypeMutation.isPending
                      ? (editingProductType ? "Updating..." : "Creating...")
                      : (editingProductType ? "Update Variation" : "Create Variation")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Session Tagging Modal */}
        {isSessionTagModalOpen && selectedProductForTagging && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Manage Sessions for {selectedProductForTagging.productName}
                </h3>
                <button
                  onClick={() => {
                    setIsSessionTagModalOpen(false);
                    setSelectedProductForTagging(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-700">Product: {selectedProductForTagging.productName}</p>
                <p className="text-xs text-gray-500">Code: {selectedProductForTagging.productCode}</p>
              </div>

              {sessionsQuery.isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading sessions...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sessionsQuery.data?.map((session) => {
                    const isTagged = selectedProductForTagging.productSessionMaps.some(
                      (psm: any) => psm.sessionId === session.id
                    );
                    
                    return (
                      <div key={session.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{session.sessionName}</p>
                          <p className="text-xs text-gray-500">
                            {session.event.eventName} - {new Date(session.sessionDate).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isTagged ? (
                            <button
                              onClick={() => handleRemoveProductFromSession(session.id)}
                              disabled={removeProductFromSessionMutation.isPending}
                              className="flex items-center px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50"
                            >
                              <Unlink className="h-3 w-3 mr-1" />
                              Remove
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAddProductToSession(session.id)}
                              disabled={addProductToSessionMutation.isPending}
                              className="flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50"
                            >
                              <Link className="h-3 w-3 mr-1" />
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {sessionsQuery.data?.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No sessions available</p>
                  )}
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setIsSessionTagModalOpen(false);
                    setSelectedProductForTagging(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
