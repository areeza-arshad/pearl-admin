// Add.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../App"; // adjust path if needed

const Add = ({ token }) => {
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    subcategory: "",
    stock: "",
    bestseller: false,
    description: "",
    details: [],
    colors: [],
    images: {}, // { colorName: File }
    faqs: [],
  });

  const [colorInput, setColorInput] = useState("");
  const [detailInput, setDetailInput] = useState("");
  const [faqInput, setFaqInput] = useState({ question: "", answer: "" });
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/category/list`);
        setCategories(res.data.categories || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
        toast.error("Failed to fetch categories");
      }
    };
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Details (bullet points)
  const handleAddDetail = () => {
    const text = detailInput.trim();
    if (text && !form.details.includes(text)) {
      setForm((prev) => ({ ...prev, details: [...prev.details, text] }));
      setDetailInput("");
    }
  };
  const handleRemoveDetail = (d) =>
    setForm((prev) => ({ ...prev, details: prev.details.filter((x) => x !== d) }));

  // Colors
  const handleAddColor = () => {
    const color = colorInput.trim().toLowerCase();
    if (!color) return;
    if (!form.colors.includes(color)) {
      setForm((prev) => ({ ...prev, colors: [...prev.colors, color] }));
    }
    setColorInput("");
  };
  const handleRemoveColor = (color) => {
    setForm((prev) => {
      const images = { ...prev.images };
      delete images[color];
      return {
        ...prev,
        colors: prev.colors.filter((c) => c !== color),
        images,
      };
    });
  };

  // File change (allow any file type)
  const handleImageChange = (color, file) => {
  if (!file) {
    console.log("No file selected for color", color);
    return;
  }
  console.log("Selected file for", color, "->", file.name, file.type, file.size);
  setForm((prev) => ({
    ...prev,
    images: {
      ...prev.images,
      [color]: file,
    },
  }));
};



  const handleRemoveFileForColor = (color) => {
    setForm((prev) => {
      const images = { ...prev.images };
      delete images[color];
      return { ...prev, images };
    });
  };

  // FAQs
  const handleAddFaq = () => {
    if (!faqInput.question || !faqInput.answer) return;
    setForm((prev) => ({ ...prev, faqs: [...prev.faqs, faqInput] }));
    setFaqInput({ question: "", answer: "" });
  };
  const handleRemoveFaq = (idx) =>
    setForm((prev) => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== idx) }));

  // Submit
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const formData = new FormData();

    // Append simple scalar fields (skip arrays & files)
    const skipKeys = ["colors", "images", "details", "faqs", "variants", "sizes"];
    Object.entries(form).forEach(([key, value]) => {
      if (!skipKeys.includes(key)) {
        formData.append(key, value === undefined || value === null ? "" : String(value));
      }
    });

    // Arrays / JSON fields
    formData.append("details", JSON.stringify(form.details || []));
    formData.append("faqs", JSON.stringify(form.faqs || []));
    formData.append("colors", JSON.stringify(form.colors || []));
    // If your backend expects `variants` as JSON, build it here:
    // For example variants may be [{ color: 'red', stock: 10 }, ...]
    // If you already build variants on client, append that. Otherwise create simple variants from colors:
    const variantsPayload = (form.colors || []).map((color, idx) => ({
      color,
      stock: 0,
    }));
    formData.append("variants", JSON.stringify(variantsPayload));

    // Append GENERAL product images as image1..image4 (if any)
    // If you have a UI to upload separate general images, collect them e.g. form.generalImages = [File,...]
    // Here we attempt to use first N files from form.images if you haven't separate fields.
    // But safest: if you have dedicated inputs, append them here directly to image1..image4.
    // Example: append image1..image4 only if form.generalImages exists:
    if (form.generalImages && Array.isArray(form.generalImages)) {
      for (let i = 0; i < Math.min(4, form.generalImages.length); i++) {
        formData.append(`image${i + 1}`, form.generalImages[i]); // image1..image4
      }
    }

    // Append VARIANT IMAGES as variantImage0, variantImage1, ...
    // Order must match variantsPayload order (i.e., form.colors order)
    for (let i = 0; i < (form.colors || []).length; i++) {
      const color = form.colors[i];
      const file = form.images[color];
      if (file) {
        formData.append(`variantImage${i}`, file); // variantImage0, variantImage1, ...
        console.log("Appended variantImage" + i, file.name, "for color", color);
      } else {
        console.log("No file for variant index", i, "color", color);
      }
    }

    // Debug: show what will be sent
    for (const pair of formData.entries()) {
      console.log("FormData:", pair[0], pair[1]);
    }

    const response = await axios.post(`${backendUrl}/api/product/add`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        // DO NOT set Content-Type manually
      },
      timeout: 120000,
    });

    toast.success(response.data?.message || "Product added successfully!");
    // Reset form (same as your existing reset)
    setForm({
      name: "",
      price: "",
      category: "",
      subcategory: "",
      stock: "",
      bestseller: false,
      description: "",
      details: [],
      colors: [],
      images: {},
      faqs: [],
    });
  } catch (err) {
    console.error("Error submitting form - full error:", err);
    if (err.response) {
      console.error("Server response:", err.response.status, err.response.data);
      toast.error(err.response.data?.message || `Failed (${err.response.status})`);
    } else {
      toast.error(err.message || "Network error");
    }
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Product</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium">Product Name*</label>
            <input
              name="name"
              value={form.name}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Price*</label>
            <input
              name="price"
              type="number"
              value={form.price}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Category*</label>
            <select
              name="category"
              value={form.category}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Subcategory</label>
            <select
              name="subcategory"
              value={form.subcategory}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
              disabled={!form.category}
            >
              <option value="">Select Subcategory</option>
              {categories
                .find((c) => c.name === form.category)
                ?.subcategories.map((sub, i) => (
                  <option key={i} value={sub}>
                    {sub}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Stock*</label>
            <input
              name="stock"
              type="number"
              value={form.stock}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="bestseller"
              checked={form.bestseller}
              onChange={handleInputChange}
              className="h-5 w-5"
            />
            <label className="ml-2 text-sm">Mark as Bestseller</label>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium">Description*</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full p-3 border rounded-lg"
            required
          />
        </div>

        {/* Details */}
        <div>
          <label className="block text-sm font-medium mb-2">Product Details</label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Slim fit, 100% cotton..."
              className="flex-1 p-3 border rounded-lg"
              value={detailInput}
              onChange={(e) => setDetailInput(e.target.value)}
            />
            <button type="button" onClick={handleAddDetail} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              Add
            </button>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {form.details.map((d, i) => (
              <li key={i} className="flex justify-between items-center">
                <span>{d}</span>
                <button type="button" onClick={() => handleRemoveDetail(d)} className="text-red-500 text-sm">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Colors & Media */}
        <div>
          <label className="block text-sm font-medium mb-2">Color Variants</label>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              placeholder="Enter color name (e.g., gold, black)"
              className="flex-1 p-3 border rounded-lg"
            />
            <button type="button" onClick={handleAddColor} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              Add Color
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.colors.map((color) => {
              const file = form.images[color];
              return (
                <div key={color} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="capitalize font-medium">{color}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleRemoveColor(color)} className="text-red-500 text-sm">
                        Remove Color
                      </button>
                    </div>
                  </div>

                  <label className="block text-sm mb-2">Attach file for {color}</label>
                 <input
  type="file"
  accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
  onChange={(e) => handleImageChange(color, e.target.files?.[0])}
  className="block w-full text-sm mb-2"
/>

                  {file ? (
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{file.name}</div>
                        <div className="text-xs text-gray-500">{file.type || "unknown type"}</div>
                        <div className="text-xs text-gray-500"> {(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button type="button" onClick={() => handleRemoveFileForColor(color)} className="text-red-500 text-sm">
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No file selected</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQs */}
        <div>
          <label className="block text-sm font-medium mb-2">FAQs (optional)</label>
          <div className="flex flex-col gap-2 mb-3">
            <input
              type="text"
              placeholder="Question"
              value={faqInput.question}
              onChange={(e) => setFaqInput({ ...faqInput, question: e.target.value })}
              className="p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Answer"
              value={faqInput.answer}
              onChange={(e) => setFaqInput({ ...faqInput, answer: e.target.value })}
              className="p-2 border rounded"
            />
            <button type="button" onClick={handleAddFaq} className="bg-blue-600 text-white px-4 py-2 rounded">
              Add FAQ
            </button>
          </div>

          <ul className="space-y-2">
            {form.faqs.map((fq, idx) => (
              <li key={idx} className="border p-2 rounded flex justify-between items-start">
                <div>
                  <p className="font-semibold">{fq.question}</p>
                  <p className="text-sm text-gray-600">{fq.answer}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFaq(idx)}
                  className="text-red-500 text-sm"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-6 rounded-lg font-medium text-white ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
          >
            {isLoading ? "Processing..." : "Add Product"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Add;
