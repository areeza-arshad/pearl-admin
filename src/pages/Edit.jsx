// src/admin/Edit.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App"; // adjust if you export this; otherwise replace with env var
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import { compressVideo } from "../utils/compressVideo";

/**
 * Edit product component
 * Props: token (string) - admin auth token
 */
const Edit = ({ token }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDetailIdx, setEditingDetailIdx] = useState(null);
const [editingDetailValue, setEditingDetailValue] = useState("");
const [isCompressing, setIsCompressing] = useState(false)
  // product-level fields
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    subcategory: "",
    stock: 0,
    bestseller: false,
    description: "",
    size: "",
    details: [],
    faqs: [],
    difficulty: "easy", // ⚡ new
  });

  // list of categories from server (for select)
  const [categories, setCategories] = useState([]);

  /**
   * Variants state:
   * [
   *   {
   *     id: optional (existing variant _id or temp id),
   *     color: string,
   *     stock: number,
   *     images: [urlString, ...],   // existing urls (kept if no new upload)
   *     videos: [urlString, ...],   // existing urls
   *     newImageFile: File|null,    // if user selected new image file — will be uploaded
   *     newVideoFile: File|null,    // if user selected new video file — will be uploaded
   *     removed: boolean            // mark to remove
   *   }
   * ]
   */
  const [variants, setVariants] = useState([]);

  // small inputs
  const [detailInput, setDetailInput] = useState("");
  const [faqInput, setFaqInput] = useState({ question: "", answer: "" });
  const [newColorInput, setNewColorInput] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const [productRes, categoryRes] = await Promise.all([
          axios.post(`${backendUrl}/api/product/single`, { productId: id }),
          axios.get(`${backendUrl}/api/category/list`),
        ]);

        if (categoryRes.data && categoryRes.data.success) {
          setCategories(categoryRes.data.categories || []);
        }

        if (!productRes.data || !productRes.data.success) {
          toast.error("Failed to load product");
          setLoading(false);
          return;
        }

        const product = productRes.data.product;

        // Normalize details
        let detailsArr = [];
        if (Array.isArray(product.details)) detailsArr = product.details;
        else if (typeof product.details === "string") {
          try {
            const parsed = JSON.parse(product.details);
            detailsArr = Array.isArray(parsed) ? parsed : [product.details];
          } catch {
            detailsArr = product.details ? [product.details] : [];
          }
        }

        // Normalize faqs
        let faqsArr = Array.isArray(product.faqs) ? product.faqs : [];

        setForm((prev) => ({
          ...prev,
          name: product.name || "",
          price: product.price ?? "",
          category: product.category || "",
          subcategory: product.subcategory || "",
          stock: product.stock ?? 0,
          bestseller: !!product.bestseller,
          description: product.description || "",
          size: product.size || "",
          details: detailsArr,
          faqs: faqsArr,
           difficulty: product.difficulty || "easy", // ⚡ add
        }));

        // Normalize variants into our UI shape
        const v = (product.variants || []).map((vv, idx) => ({
          id: vv._id || `existing-${idx}`,
          color: vv.color || `variant-${idx}`,
          stock: typeof vv.stock === "number" ? vv.stock : (product.stock || 0),
          images: Array.isArray(vv.images) ? vv.images : (vv.images ? [vv.images] : []),
          videos: Array.isArray(vv.videos) ? vv.videos : (vv.videos ? [vv.videos] : []),
          newImageFile: null,
          newVideoFile: null,
          removed: false,
        }));

        setVariants(v);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };

    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
const beginEditDetail = (idx) => {
  setEditingDetailIdx(idx);
  setEditingDetailValue(form.details[idx] ?? "");
};

const saveDetailEdit = () => {
  const v = (editingDetailValue || "").trim();
  if (!v) return toast.error("Detail cannot be empty");
  setForm((prev) => ({
    ...prev,
    details: prev.details.map((d, i) => (i === editingDetailIdx ? v : d)),
  }));
  setEditingDetailIdx(null);
  setEditingDetailValue("");
};

const cancelDetailEdit = () => {
  setEditingDetailIdx(null);
  setEditingDetailValue("");
};
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const normalizeColor = (s) => String(s || "").trim().toLowerCase();

const commitVariantColor = (index) => {
  const raw = variants[index]?.color;
  const next = normalizeColor(raw);
  if (!next) {
    toast.error("Enter a valid color");
    return;
  }
  // prevent duplicate colors among non-removed variants
  const dup = variants.some(
    (v, i) => !v.removed && i !== index && normalizeColor(v.color) === next
  );
  if (dup) {
    toast.warn(`"${next}" already exists`);
    return;
  }
  // write back normalized value
  updateVariantAt(index, { color: next });
};

  // Details management
  const handleAddDetail = () => {
    const t = detailInput.trim();
    if (!t) return toast.error("Empty detail");
    if (form.details.includes(t)) return toast.warn("Detail already present");
    setForm((p) => ({ ...p, details: [...p.details, t] }));
    setDetailInput("");
  };
  const handleRemoveDetail = (d) => setForm((p) => ({ ...p, details: p.details.filter((x) => x !== d) }));

  // FAQ management
  const handleAddFaq = () => {
    if (!faqInput.question.trim() || !faqInput.answer.trim()) return toast.error("Provide both question and answer");
    setForm((p) => ({ ...p, faqs: [...p.faqs, { ...faqInput }] }));
    setFaqInput({ question: "", answer: "" });
  };
  const handleRemoveFaq = (idx) => setForm((p) => ({ ...p, faqs: p.faqs.filter((_, i) => i !== idx) }));

  // Variant helpers
  const updateVariantAt = (index, patch) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const handleVariantColorChange = (index, value) => updateVariantAt(index, { color: value });
  const handleVariantStockChange = (index, value) => updateVariantAt(index, { stock: Number(value || 0) });

  const handleVariantImageFile = (index, file) => {
    updateVariantAt(index, { newImageFile: file || null });
  };
  const handleVariantVideoFile = (index, file) => {
    updateVariantAt(index, { newVideoFile: file || null });
  };

  const handleRemoveVariant = (index) => {
    // If variant is existing (has id from DB) mark removed, otherwise simply drop it
    setVariants((prev) => {
      const copy = [...prev];
      if (copy[index].id && String(copy[index].id).startsWith("existing-")) {
        // actually it's existing id placeholder; still treat as existing and mark removed
        copy[index].removed = true;
        return copy;
      }
      // drop new variant
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleAddNewVariant = () => {
    const color = newColorInput.trim();
    if (!color) return toast.error("Enter color name");
    // ensure unique color
    if (variants.some((v) => !v.removed && String(v.color).toLowerCase() === color.toLowerCase())) {
      return toast.warn("Variant color already exists");
    }
    setVariants((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        color,
        stock: 0,
        images: [],
        videos: [],
        newImageFile: null,
        newVideoFile: null,
        removed: false,
      },
    ]);
    setNewColorInput("");
  };

  // Submit: build FormData and send to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    // basic validation
    if (!form.name || !form.price || !form.category) {
      toast.error("Please fill required fields (name, price, category)");
      return;
    }
   if(isCompressing){
        toast.error("Please wait for compression to finish")
        return
      }
    // Ensure every non-removed variant has an image (either existing URL or newImageFile)
    const activeVariants = variants.filter((v) => !v.removed);
    if (activeVariants.length === 0) {
      toast.error("At least one variant is required");
      return;
    }
    for (let i = 0; i < activeVariants.length; i++) {
      const v = activeVariants[i];
      if (!v.images?.length && !v.newImageFile) {
        toast.error(`Variant "${v.color}" must have an image (upload or keep existing).`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Build arrays matching current variants order (we will send colors and variantStocks arrays)
      // We will exclude removed variants from the arrays because controller expects colors array representing final variants
      const finalVariants = variants.filter((v) => !v.removed);

      const colorsArray = finalVariants.map((v) => v.color);
      const variantStocksArray = finalVariants.map((v) => Number(v.stock || 0));

      // Always use FormData because we may have files to upload
      const fd = new FormData();

      // Append top-level fields
      fd.append("id", id);
      fd.append("name", String(form.name || ""));
      fd.append("price", String(form.price ?? ""));
      fd.append("category", String(form.category || ""));
      fd.append("subcategory", String(form.subcategory || ""));
      fd.append("stock", String(form.stock ?? 0));
      fd.append("bestseller", String(!!form.bestseller));
      fd.append("description", String(form.description || ""));
      fd.append("difficulty", String(form.difficulty || "easy"));

      if (form.size !== undefined) fd.append("size", String(form.size));

      // arrays as JSON strings (controller parseMaybeJsonArray will accept JSON or array)
      fd.append("colors", JSON.stringify(colorsArray));
      fd.append("variantStocks", JSON.stringify(variantStocksArray));
      fd.append("details", JSON.stringify(form.details || []));
      fd.append("faqs", JSON.stringify(form.faqs || []));

      // For each variant in finalVariants, in that order, we need to append new files (if any)
      // The controller expects fields named variantImage{i} and variantVideo{i} for i=0..N-1 mapping to colors array
      for (let i = 0; i < finalVariants.length; i++) {
        const v = finalVariants[i];

        // If user provided a new image file for this variant, append field variantImage{i}
        if (v.newImageFile instanceof File) {
          fd.append(`variantImage${i}`, v.newImageFile, v.newImageFile.name);
        } else {
          // If no new file but there are existing URLs, we don't append a file; backend will reuse existing images by matching color
          // Some backends want the existing URLs too; our controller reuses existing product.variants if new image not provided.
        }

        // If user provided a new video file, append variantVideo{i}
        if (v.newVideoFile instanceof File) {
          fd.append(`variantVideo${i}`, v.newVideoFile, v.newVideoFile.name);
        }
      }

      // Send request
      const headers = {
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "multipart/form-data",
      };

      const res = await axios.post(`${backendUrl}/api/product/update`, fd, { headers, timeout: 10 * 60 * 1000 });

      if (res?.data?.success) {
        toast.success(res.data.message || "Product updated");
        navigate("/list");
      } else {
        throw new Error(res?.data?.message || "Update failed");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error(err?.response?.data?.message || err.message || "Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Edit Product</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Product Name*</label>
            <input name="name" value={form.name} onChange={handleInputChange} className="w-full p-2 border rounded" required />
          </div>

          <div>
            <label className="block text-sm font-medium">Price*</label>
            <input name="price" type="number" value={form.price} onChange={handleInputChange} className="w-full p-2 border rounded" required />
          </div>

          <div>
            <label className="block text-sm font-medium">Category*</label>
            <select name="category" value={form.category} onChange={handleInputChange} className="w-full p-2 border rounded" required>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
  <label className="block text-sm font-medium">Difficulty*</label>
  <select
    name="difficulty"
    value={form.difficulty}
    onChange={handleInputChange}
    className="w-full p-2 border rounded"
    required
  >
    <option value="easy">Easy</option>
    <option value="medium">Medium</option>
    <option value="difficult">Difficult</option>
  </select>
</div>


          <div>
            <label className="block text-sm font-medium">Subcategory</label>
            <select name="subcategory" value={form.subcategory} onChange={handleInputChange} className="w-full p-2 border rounded">
              <option value="">Select subcategory</option>
              {categories.find((c) => c.name === form.category)?.subcategories?.map((s, i) => <option key={i} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Global Stock*</label>
            <input name="stock" type="number" min="0" value={form.stock} onChange={handleInputChange} className="w-full p-2 border rounded" required />
            <p className="text-xs text-gray-500 mt-1">Used as fallback for variants without per-variant stock</p>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" name="bestseller" checked={form.bestseller} onChange={handleInputChange} className="h-4 w-4" />
            <label className="text-sm">Mark as Bestseller</label>
          </div>

          <div>
            <label className="block text-sm font-medium">Size</label>
            <input name="size" value={form.size} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium">Description*</label>
          <textarea name="description" value={form.description} onChange={handleInputChange} rows={4} className="w-full p-2 border rounded" required />
        </div>

        {/* Details */}
        <div>
          <label className="block text-sm font-medium mb-2">Product Details</label>
          <div className="flex gap-2 mb-3">
            <input value={detailInput} onChange={(e) => setDetailInput(e.target.value)} placeholder="Add bullet point" className="flex-1 p-2 border rounded" />
            <button type="button" onClick={handleAddDetail} className="px-3 bg-blue-600 text-white rounded">Add</button>
          </div>
          <ul className="space-y-2">
  {form.details.map((d, idx) => {
    const isEditing = editingDetailIdx === idx;
    return (
      <li key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded">
        <div className="flex-1 mr-3">
          {isEditing ? (
            <input
              autoFocus
              className="w-full p-2 border rounded"
              value={editingDetailValue}
              onChange={(e) => setEditingDetailValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveDetailEdit();
                if (e.key === "Escape") cancelDetailEdit();
              }}
            />
          ) : (
            <span>{d}</span>
          )}
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button type="button" onClick={saveDetailEdit} className="px-3 py-1 bg-green-600 text-white rounded">
                Save
              </button>
              <button type="button" onClick={cancelDetailEdit} className="px-3 py-1 bg-gray-300 rounded">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => beginEditDetail(idx)} className="text-blue-600 text-sm">
                Edit
              </button>
              <button type="button" onClick={() => handleRemoveDetail(d)} className="text-red-500 text-sm">
                Remove
              </button>
            </>
          )}
        </div>
      </li>
    );
  })}
</ul>

        </div>

        {/* FAQs */}
        <div>
          <label className="block text-sm font-medium mb-2">FAQs</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <input placeholder="Question" value={faqInput.question} onChange={(e) => setFaqInput((p) => ({ ...p, question: e.target.value }))} className="p-2 border rounded col-span-2" />
            <input placeholder="Answer" value={faqInput.answer} onChange={(e) => setFaqInput((p) => ({ ...p, answer: e.target.value }))} className="p-2 border rounded" />
            <div className="md:col-span-3">
              <button type="button" onClick={handleAddFaq} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded">Add FAQ</button>
            </div>
          </div>

          <ul className="space-y-2">
            {form.faqs.map((fq, idx) => (
              <li key={idx} className="border p-2 rounded flex justify-between items-center">
                <div>
                  <p className="font-semibold">{fq.question}</p>
                  <p className="text-sm text-gray-600">{fq.answer}</p>
                </div>
                <button type="button" onClick={() => handleRemoveFaq(idx)} className="text-red-500">Remove</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Variants editor */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium">Variants (colors)</label>
            <div className="flex items-center gap-2">
              <input placeholder="New color" value={newColorInput} onChange={(e) => setNewColorInput(e.target.value)} className="p-1 border rounded" />
              <button type="button" onClick={handleAddNewVariant} className="px-3 py-1 bg-green-600 text-white rounded">Add Variant</button>
            </div>
          </div>

          <div className="grid gap-4">
            {variants.map((v, idx) => (
              <div key={v.id} className={`border p-3 rounded ${v.removed ? "opacity-50 bg-red-50" : "bg-white"}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex gap-2 items-center">
                      <input
  className="p-2 border rounded w-48"
  value={v.color}
  onChange={(e) => handleVariantColorChange(idx, e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitVariantColor(idx);
    }
  }}
  onBlur={() => commitVariantColor(idx)}
  disabled={v.removed}
/>

                      <input type="number" className="p-2 border rounded w-28" value={v.stock} onChange={(e) => handleVariantStockChange(idx, e.target.value)} disabled={v.removed} min="0" />
                      <span className="text-xs text-gray-500">Stock</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">Existing images/videos (kept if you don't upload new files)</div>

                    <div className="mt-2 flex gap-3 items-center">
                      {/* existing image preview */}
                      <div className="w-24 h-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                        {v.newImageFile ? (
                          <img src={URL.createObjectURL(v.newImageFile)} alt="preview" className="w-full h-full object-cover" />
                        ) : v.images?.[0] ? (
                          <img src={v.images[0]} alt="existing" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-400">No image</span>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs">Replace Image</label>
                        <input type="file" accept="image/*" onChange={(e) => handleVariantImageFile(idx, e.target.files?.[0] || null)} disabled={v.removed} />
                      </div>

                      <div className="w-36">
                        <label className="block text-xs">Replace Video (optional)</label>

<input 
  type="file" 
  accept="video/*" 
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log(file)
     setIsCompressing(true)
    // Compress if >5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.info("Compressing video...");
      try {
        // console.log("here")
        const compressed = await compressVideo(file); 
        toast.success(`✅ Compression Successful`);
        setIsCompressing(false)
        handleVariantVideoFile(idx, compressed);
      } catch (err) {
        // console.log(err)
        toast.error("Using original");
        handleVariantVideoFile(idx, file);
      }
    } else {
      handleVariantVideoFile(idx, file);
    }
  }} 
  disabled={v.removed}
/>

                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <button type="button" onClick={() => handleRemoveVariant(idx)} className={`px-3 py-1 rounded ${v.removed ? "bg-yellow-400" : "bg-red-500 text-white"}`}>
                      {v.removed ? "Undo Remove" : "Remove Variant"}
                    </button>

                    {/* Show variant metadata if exists */}
                    {v.id && !String(v.id).startsWith("new-") && <div className="text-xs text-gray-500">ID: {v.id}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div>
          <button type="submit" disabled={isSubmitting} className={`w-full py-3 rounded text-white ${isSubmitting ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Edit;
