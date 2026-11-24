
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabasePublic } from "@/lib/supabase";

const supabase = supabasePublic();

type Product = {
  id: string;
  slug: string;
  category: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  description_ar: string;
  description_fr: string;
  description_en: string;
  price: number;
  discount_price: number | null;
  quantity: number;
  image_url: string;
  active: boolean;
};

type ProductForm = Omit<Product, "id">;

const emptyProduct: ProductForm = {
  slug: "",
  category: "perfume",
  name_ar: "",
  name_fr: "",
  name_en: "",
  description_ar: "",
  description_fr: "",
  description_en: "",
  price: 0,
  discount_price: null,
  quantity: 0,
  image_url: "",
  active: true,
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProduct(row: any): Product {
  return {
    ...row,
    slug: row.slug ?? "",
    category: row.category ?? "perfume",
    price: Number(row.price ?? 0),
    discount_price:
      row.discount_price == null ? null : Number(row.discount_price),
    quantity: Number(row.quantity ?? 0),
    image_url: row.image_url ?? "",
    active: Boolean(row.active),
  };
}

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>({ ...emptyProduct });
  const [mobileMenu, setMobileMenu] = useState(false);

  // LOAD PRODUCTS
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setPageError("");

      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts((data ?? []).map(normalizeProduct));
      } catch (error) {
        setPageError(
          error instanceof Error ? error.message : "Unable to load products.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const totalProducts = products.length;
  const inStock = products.filter((p) => p.quantity > 0).length;
  const outOfStock = products.filter((p) => p.quantity === 0).length;
  const discounted = products.filter(
    (p) => p.discount_price !== null && p.discount_price < p.price,
  ).length;

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const text = search.toLowerCase();

      const matchesSearch =
        product.name_en.toLowerCase().includes(text) ||
        product.name_fr.toLowerCase().includes(text) ||
        product.name_ar.includes(search);

      const matchesFilter =
        filter === "all" ||
        (filter === "stock" && product.quantity > 0) ||
        (filter === "out" && product.quantity === 0) ||
        (filter === "discount" &&
          product.discount_price !== null &&
          product.discount_price < product.price) ||
        (filter === "hidden" && !product.active);

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  function openNewProduct() {
    setEditingId(null);
    setForm({ ...emptyProduct });
    setModalOpen(true);
  }

  function openEditProduct(product: Product) {
    setEditingId(product.id);
    setForm({
      slug: product.slug,
      category: product.category,
      name_ar: product.name_ar,
      name_fr: product.name_fr,
      name_en: product.name_en,
      description_ar: product.description_ar,
      description_fr: product.description_fr,
      description_en: product.description_en,
      price: product.price,
      discount_price: product.discount_price,
      quantity: product.quantity,
      image_url: product.image_url,
      active: product.active,
    });
    setModalOpen(true);
  }

  function updateField<K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // UPLOAD IMAGE TO SUPABASE STORAGE
  async function handleImageUpload(file: File | undefined) {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Please select a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5 MB.");
      return;
    }

    setUploadingImage(true);
    setPageError("");

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      updateField("image_url", data.publicUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image upload failed.";
      setPageError(message);
      alert(`Image upload failed: ${message}`);
    } finally {
      setUploadingImage(false);
    }
  }

  // SAVE PRODUCT TO DATABASE
  async function saveProduct() {
    if (!form.name_en.trim() || form.price < 0 || form.quantity < 0) {
      alert("Please check the product name, price and quantity.");
      return;
    }

    if (uploadingImage) {
      alert("Please wait until the image upload finishes.");
      return;
    }

    if (
      form.discount_price !== null &&
      (form.discount_price < 0 || form.discount_price >= form.price)
    ) {
      alert("Discount price must be lower than the original price.");
      return;
    }

    const productData = {
      ...form,
      slug: form.slug.trim() || slugify(form.name_en),
      category: form.category || "perfume",
      price: Number(form.price),
      discount_price:
        form.discount_price === null ? null : Number(form.discount_price),
      quantity: Number(form.quantity),
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    setPageError("");

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingId)
          .select()
          .single();

        if (error) throw error;

        const updated = normalizeProduct(data);
        setProducts((current) =>
          current.map((p) => (p.id === editingId ? updated : p)),
        );
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single();

        if (error) throw error;

        setProducts((current) => [normalizeProduct(data), ...current]);
      }

      setModalOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save product.";
      setPageError(message);
      alert(`Database save failed: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  // DELETE PRODUCT
  async function deleteProduct(id: string) {
    if (!confirm("Are you sure you want to delete this perfume?")) return;

    setPageError("");

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      setPageError(error.message);
      alert(`Delete failed: ${error.message}`);
      return;
    }

    setProducts((current) => current.filter((p) => p.id !== id));
  }

  // PUBLISH / HIDE
  async function toggleActive(id: string) {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const nextActive = !product.active;

    const { error } = await supabase
      .from("products")
      .update({
        active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setPageError(error.message);
      alert(`Status update failed: ${error.message}`);
      return;
    }

    setProducts((current) =>
      current.map((p) => (p.id === id ? { ...p, active: nextActive } : p)),
    );
  }

  return (
    <div className="oz-admin">
      {mobileMenu && (
        <div
          className="oz-admin-overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`oz-admin-sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="oz-admin-logo">
          <a href="/ar" className="oz-admin-brand">OZAVEA</a>
          <span>ADMINISTRATION</span>
        </div>

        <div className="oz-admin-nav-label">WORKSPACE</div>

        <button className="oz-admin-nav-item active">
          <span>▦</span> Overview
        </button>

        <button
          className="oz-admin-nav-item"
          onClick={() => {
            setFilter("all");
            setMobileMenu(false);
            document.getElementById("inventory")?.scrollIntoView({
              behavior: "smooth",
            });
          }}
        >
          <span>▤</span> Products & Inventory
        </button>

        <button
          className="oz-admin-nav-item"
          onClick={() => {
            setFilter("discount");
            setMobileMenu(false);
            document.getElementById("inventory")?.scrollIntoView({
              behavior: "smooth",
            });
          }}
        >
          <span>％</span> Discounts
        </button>

        <div className="oz-admin-sidebar-bottom">
          <div className="oz-admin-profile">
            <div className="oz-admin-avatar">O</div>
            <div>
              <strong>OZAVEA Admin</strong>
              <small>Store manager</small>
            </div>
          </div>

          <a href="/" className="oz-admin-back">↗ View storefront</a>
        </div>
      </aside>

      {/* MAIN */}
      <main className="oz-admin-main">
        <header className="oz-admin-topbar">
          <button
            className="oz-admin-mobile-toggle"
            onClick={() => setMobileMenu(true)}
          >
            ☰
          </button>

          <div className="oz-admin-breadcrumb">
            <span>Workspace</span> / <strong>Overview</strong>
          </div>

          <div className="oz-admin-topbar-right">
            <span className="oz-admin-live-dot" />
            <span>Store management</span>
          </div>
        </header>

        <div className="oz-admin-content">
          {pageError && (
            <div role="alert" className="oz-admin-error">{pageError}</div>
          )}

          {loading && (
            <div className="oz-admin-loading">Loading products from Supabase…</div>
          )}

          <section className="oz-admin-welcome">
            <div>
              <p className="oz-admin-eyebrow">YOUR STORE AT A GLANCE</p>
              <h1>Overview</h1>
              <p>Manage your fragrance collection and inventory.</p>
            </div>
            <button className="oz-admin-primary" onClick={openNewProduct}>
              <span>＋</span> Add perfume
            </button>
          </section>

          {/* STATISTICS */}
          <section className="oz-admin-stats">
            <StatCard label="Total products" value={totalProducts} icon="▦" detail="In your catalog" />
            <StatCard label="Available" value={inStock} icon="✓" detail="Products in stock" />
            <StatCard label="Out of stock" value={outOfStock} icon="!" detail="Needs replenishment" warning />
            <StatCard label="On discount" value={discounted} icon="％" detail="Promotional items" />
          </section>

          {/* STOCK OVERVIEW */}
          <section className="oz-admin-stock-banner">
            <div className="oz-admin-stock-icon">▣</div>
            <div className="oz-admin-stock-text">
              <strong>Inventory overview</strong>
              <span>
                {inStock} products available · {outOfStock} products unavailable
              </span>
            </div>
            <button
              onClick={() => {
                setFilter("out");
                document.getElementById("inventory")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              View unavailable →
            </button>
          </section>

          {/* INVENTORY */}
          <section className="oz-admin-panel" id="inventory">
            <div className="oz-admin-panel-heading">
              <div>
                <p className="oz-admin-eyebrow">CATALOG MANAGEMENT</p>
                <h2>Product inventory</h2>
              </div>
              <button className="oz-admin-secondary" onClick={openNewProduct}>
                ＋ Add product
              </button>
            </div>

            <div className="oz-admin-toolbar">
              <div className="oz-admin-search">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search perfume..."
                />
              </div>

              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All products</option>
                <option value="stock">Available</option>
                <option value="out">Out of stock</option>
                <option value="discount">Discounted</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            <div className="oz-admin-table-wrap">
              <table className="oz-admin-table">
                <thead>
                  <tr>
                    <th>PRODUCT</th>
                    <th>PRICE</th>
                    <th>DISCOUNT</th>
                    <th>STOCK</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="oz-admin-product">
                          <div className="oz-admin-product-image">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name_en} />
                            ) : <span>✧</span>}
                          </div>
                          <div className="oz-admin-product-info">
                            <strong>{product.name_en}</strong>
                            <small>{product.name_fr}</small>
                          </div>
                        </div>
                      </td>

                      <td><strong>{money(product.price)} MAD</strong></td>

                      <td>
                        {product.discount_price !== null &&
                        product.discount_price < product.price ? (
                          <div className="oz-admin-discount">
                            <strong>{money(product.discount_price)} MAD</strong>
                            <small>
                              {Math.round((1 - product.discount_price / product.price) * 100)}% off
                            </small>
                          </div>
                        ) : <span className="oz-admin-muted">—</span>}
                      </td>

                      <td>
                        <span className={`oz-admin-stock ${
                          product.quantity === 0
                            ? "out"
                            : product.quantity <= 3
                              ? "low"
                              : ""
                        }`}>
                          {product.quantity}
                        </span>
                      </td>

                      <td>
                        {product.quantity === 0 ? (
                          <span className="oz-admin-status out">● Out of stock</span>
                        ) : product.active ? (
                          <span className="oz-admin-status active">● Active</span>
                        ) : (
                          <span className="oz-admin-status hidden">● Hidden</span>
                        )}
                      </td>

                      <td>
                        <div className="oz-admin-actions">
                          <button title="Edit product" onClick={() => openEditProduct(product)}>✎</button>
                          <button
                            title={product.active ? "Hide product" : "Publish product"}
                            onClick={() => toggleActive(product.id)}
                          >
                            {product.active ? "◉" : "○"}
                          </button>
                          <button
                            title="Delete product"
                            className="delete"
                            onClick={() => deleteProduct(product.id)}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && filteredProducts.length === 0 && (
                <div className="oz-admin-empty">
                  <span>⌕</span>
                  <strong>No products found</strong>
                  <p>Try another search or filter.</p>
                </div>
              )}
            </div>

            <div className="oz-admin-table-footer">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </section>

          <footer className="oz-admin-footer">
            <span>OZAVEA ADMIN</span>
            <span>Inventory management</span>
          </footer>
        </div>
      </main>

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div
          className="oz-admin-modal-backdrop"
          onClick={() => !saving && !uploadingImage && setModalOpen(false)}
        >
          <div className="oz-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="oz-admin-modal-heading">
              <div>
                <p className="oz-admin-eyebrow">PRODUCT MANAGEMENT</p>
                <h2>{editingId ? "Edit perfume" : "Add new perfume"}</h2>
              </div>
              <button
                className="oz-admin-close"
                onClick={() => !saving && !uploadingImage && setModalOpen(false)}
                disabled={saving || uploadingImage}
              >
                ×
              </button>
            </div>

            <div className="oz-admin-modal-body">
              {/* PRODUCT DETAILS */}
              <div className="oz-admin-form-section">
                <h3>Product details</h3>
                <div className="oz-admin-form-grid">
                  <Field label="Slug (auto-generated if empty)">
                    <input
                      value={form.slug}
                      onChange={(e) => updateField("slug", e.target.value)}
                      placeholder="royal-oud"
                    />
                  </Field>
                  <Field label="Category">
                    <input
                      value={form.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      placeholder="perfume"
                    />
                  </Field>
                </div>
              </div>

              {/* PRODUCT NAMES */}
              <div className="oz-admin-form-section">
                <h3>Product names</h3>
                <div className="oz-admin-form-grid">
                  <Field label="Name (English)">
                    <input
                      value={form.name_en}
                      onChange={(e) => updateField("name_en", e.target.value)}
                      placeholder="Perfume name"
                    />
                  </Field>
                  <Field label="Name (French)">
                    <input
                      value={form.name_fr}
                      onChange={(e) => updateField("name_fr", e.target.value)}
                      placeholder="Nom du parfum"
                    />
                  </Field>
                  <Field label="Name (Arabic)" rtl>
                    <input
                      value={form.name_ar}
                      onChange={(e) => updateField("name_ar", e.target.value)}
                      placeholder="اسم العطر"
                    />
                  </Field>
                </div>
              </div>

              {/* DESCRIPTIONS */}
              <div className="oz-admin-form-section">
                <h3>Descriptions</h3>
                <div className="oz-admin-form-grid">
                  <Field label="Description (English)">
                    <textarea
                      rows={3}
                      value={form.description_en}
                      onChange={(e) => updateField("description_en", e.target.value)}
                    />
                  </Field>
                  <Field label="Description (French)">
                    <textarea
                      rows={3}
                      value={form.description_fr}
                      onChange={(e) => updateField("description_fr", e.target.value)}
                    />
                  </Field>
                  <Field label="Description (Arabic)" rtl>
                    <textarea
                      rows={3}
                      value={form.description_ar}
                      onChange={(e) => updateField("description_ar", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* PRICING */}
              <div className="oz-admin-form-section">
                <h3>Pricing & inventory</h3>
                <div className="oz-admin-form-grid three">
                  <Field label="Original price (MAD)">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => updateField("price", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Discount price (MAD)">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                      value={form.discount_price ?? ""}
                      onChange={(e) =>
                        updateField("discount_price", e.target.value === "" ? null : Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Quantity in stock">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.quantity}
                      onChange={(e) => updateField("quantity", Number(e.target.value))}
                    />
                  </Field>
                </div>
              </div>

              {/* IMAGE UPLOAD COMPONENT */}
              <div className="oz-admin-form-section">
                <h3>Product image</h3>

                <div className="oz-admin-upload-box">
                  <label className="oz-admin-upload-label">
                    <span className="oz-admin-upload-icon">↑</span>
                    <strong>
                      {uploadingImage ? "Uploading image…" : "Upload product image"}
                    </strong>
                    <small>JPG, PNG or WEBP · Maximum file size 5 MB</small>

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingImage || saving}
                      onChange={(e) => {
                        handleImageUpload(e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  {uploadingImage && (
                    <p className="oz-admin-loading">Uploading to Supabase Storage…</p>
                  )}

                  {form.image_url && (
                    <div className="oz-admin-image-preview">
                      <img
                        src={form.image_url}
                        alt="Product preview"
                        style={{
                          display: "block",
                          width: "100%",
                          maxWidth: "220px",
                          height: "220px",
                          objectFit: "cover",
                          borderRadius: "12px",
                        }}
                      />
                      <button
                        type="button"
                        className="oz-admin-cancel"
                        disabled={uploadingImage}
                        onClick={() => updateField("image_url", "")}
                      >
                        Remove image
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* VISIBILITY */}
              <div className="oz-admin-form-section">
                <h3>Store visibility</h3>
                <label className="oz-admin-toggle-row">
                  <div>
                    <strong>Publish product</strong>
                    <small>Visible to customers on the storefront</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => updateField("active", e.target.checked)}
                  />
                </label>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="oz-admin-modal-footer">
              <button
                className="oz-admin-cancel"
                onClick={() => !saving && !uploadingImage && setModalOpen(false)}
                disabled={saving || uploadingImage}
              >
                Cancel
              </button>
              <button
                className="oz-admin-primary"
                onClick={saveProduct}
                disabled={saving || uploadingImage}
              >
                {uploadingImage
                  ? "Uploading image…"
                  : saving
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Create product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  detail,
  warning = false,
}: {
  label: string;
  value: number;
  icon: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="oz-admin-stat-card">
      <div className={`oz-admin-stat-icon ${warning ? "warning" : ""}`}>
        {icon}
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Field({
  label,
  children,
  rtl = false,
}: {
  label: string;
  children: ReactNode;
  rtl?: boolean;
}) {
  return (
    <label className={`oz-admin-field ${rtl ? "rtl" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
