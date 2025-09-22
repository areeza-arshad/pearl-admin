// src/admin/Add.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import imageCompression from "browser-image-compression";
import { backendUrl } from "../App"; // adjust if needed

const MAX_VARIANTS = 30;
const MAX_IMAGE_MB = 50;
const MAX_VIDEO_MB = 100;

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
    size: "",
    variantStocks: {}, // <-- per-variant stock { color: number }
  });

  const [videoFiles, setVideoFiles] = useState({});
  const [colorInput, setColorInput] = useState("");
  const [detailInput, setDetailInput] = useState("");
  const [faqInput, setFaqInput] = useState({ question: "", answer: "" });
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/category/list`);
        setCategories(res.data.categories || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
        toast.error("Failed to fetch categories");
      }
    })();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  // details
  const handleAddDetail = () => {
    const text = detailInput.trim();
    if (!text) return toast.error("Detail is empty");
    if (form.details.includes(text)) return toast.warn("Detail already added");
    setForm((prev) => ({ ...prev, details: [...prev.details, text] }));
    setDetailInput("");
  };
  const handleRemoveDetail = (d) => setForm((prev) => ({ ...prev, details: prev.details.filter((x) => x !== d) }));

  // faqs
  const handleAddFaq = () => {
    if (!faqInput.question.trim() || !faqInput.answer.trim()) return toast.error("Provide both question and answer");
    setForm((prev) => ({ ...prev, faqs: [...prev.faqs, { ...faqInput }] }));
    setFaqInput({ question: "", answer: "" });
  };
  const handleRemoveFaq = (idx) => setForm((prev) => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== idx) }));

  // colors
  const handleAddColor = () => {
    const color = colorInput.trim().toLowerCase();
    if (!color) return toast.error("Enter color name");
    if (form.colors.includes(color)) return toast.warn("Color already exists");
    if (form.colors.length >= MAX_VARIANTS) return toast.error(`Max ${MAX_VARIANTS} variants allowed`);
    setForm((prev) => ({
      ...prev,
      colors: [...prev.colors, color],
      variantStocks: { ...prev.variantStocks, [color]: 0 }, // default stock
    }));
    setColorInput("");
  };
  const handleRemoveColor = (color) => {
    setForm((prev) => {
      const images = { ...prev.images };
      delete images[color];
      const stocks = { ...prev.variantStocks };
      delete stocks[color];
      return { ...prev, colors: prev.colors.filter((c) => c !== color), images, variantStocks: stocks };
    });
    setVideoFiles((prev) => {
      const copy = { ...prev };
      delete copy[color];
      return copy;
    });
  };

  // image change handler
  const handleImageChange = async (color, file) => {
    if (!file) return toast.error("No file selected");
    if (!file.type.startsWith("image/")) return toast.error("Please select a valid image file");
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return toast.error(`Image exceeds ${MAX_IMAGE_MB}MB limit`);

    let processed = file;
    if (file.size > 1 * 1024 * 1024) {
      try {
        processed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
      } catch {
        processed = file;
      }
    }

    setForm((prev) => ({ ...prev, images: { ...prev.images, [color]: processed } }));
  };

  const handleVideoChange = (color, file) => {
    if (!file) return toast.error("No video selected");
    if (!file.type.startsWith("video/")) return toast.error("Please select a valid video file");
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return toast.error(`Video exceeds ${MAX_VIDEO_MB}MB limit`);
    setVideoFiles((prev) => ({ ...prev, [color]: file }));
  };

  const axiosWithRetry = async (config, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await axios(config);
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!form.name || !form.price || !form.category || !form.stock) {
        toast.error("Please fill required fields (name, price, category, stock)");
        setIsLoading(false);
        return;
      }
      if (form.colors.length === 0) {
        toast.error("Please add at least one color variant");
        setIsLoading(false);
        return;
      }
      const missingImages = form.colors.filter((c) => !form.images[c]);
      if (missingImages.length > 0) {
        toast.error(`Please upload images for colors: ${missingImages.join(", ")}`);
        setIsLoading(false);
        return;
      }

      const formData = new FormData();
      Object.entries({
        name: form.name,
        price: form.price,
        category: (form.category || "").toLowerCase(),
        subcategory: (form.subcategory || "").toLowerCase(),
        stock: form.stock,
        bestseller: form.bestseller,
        description: form.description,
        size: form.size,
      }).forEach(([k, v]) => formData.append(k, String(v ?? "")));

      formData.append("details", JSON.stringify(form.details || []));
      formData.append("faqs", JSON.stringify(form.faqs || []));
      formData.append("colors", JSON.stringify(form.colors || []));
      formData.append(
        "variantStocks",
        JSON.stringify(form.colors.map((c) => form.variantStocks?.[c] || 0))
      );

      form.colors.forEach((color, i) => {
        const imageFile = form.images[color];
        if (imageFile) formData.append(`variantImage${i}`, imageFile, imageFile.name);
        const videoFile = videoFiles[color];
        if (videoFile) formData.append(`variantVideo${i}`, videoFile, videoFile.name);
      });

      const response = await axiosWithRetry({
        method: "post",
        url: `${backendUrl}/api/product/add`,
        data: formData,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10 * 60 * 1000,
      });

      toast.success(response.data?.message || "Product added successfully!");
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
        size: "",
        variantStocks: {},
      });
      setVideoFiles({});
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Product</h2>

      <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Name*</label>
            <input name="name" value={form.name} onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price*</label>
            <input name="price" type="number" value={form.price} onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category*</label>
            <select name="category" value={form.category} onChange={handleInputChange} className="w-full p-3 border rounded-lg" required>
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subcategory</label>
            <select name="subcategory" value={form.subcategory} onChange={handleInputChange} className="w-full p-3 border rounded-lg" disabled={!form.category}>
              <option value="">Select Subcategory</option>
              {categories.find((c) => c.name === form.category)?.subcategories?.map((sub, i) => (
                <option key={i} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Stock*</label>
            <input name="stock" type="number" min="0" value={form.stock} onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
            <div className="text-xs text-gray-500 mt-1">This is the default global stock for variants unless you set per-variant stock below.</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Size</label>
            <input name="size" value={form.size} onChange={handleInputChange} className="w-full p-3 border rounded-lg" />
          </div>

          <div className="flex items-center">
            <input type="checkbox" name="bestseller" checked={form.bestseller} onChange={handleInputChange} className="h-5 w-5" />
            <label className="ml-2 text-sm">Mark as Bestseller</label>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description*</label>
          <textarea name="description" value={form.description} onChange={handleInputChange} rows={3} className="w-full p-3 border rounded-lg" required />
        </div>

        {/* Details */}
        <div>
          <label className="block text-sm font-medium mb-2">Product Details</label>
          <div className="flex gap-2 mb-3">
            <input type="text" value={detailInput} onChange={(e) => setDetailInput(e.target.value)} placeholder="Add bullet point" className="flex-1 p-3 border rounded-lg" />
            <button type="button" onClick={handleAddDetail} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Add</button>
          </div>
          <ul className="space-y-2">
            {form.details.map((d, i) => (
              <li key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span>{d}</span>
                <button type="button" onClick={() => handleRemoveDetail(d)} className="text-red-500 text-sm">Remove</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Color variants (images + optional video + per-variant stock) */}
       <div>
          <label className="block text-sm font-medium mb-2">Color Variants</label>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              placeholder="Enter color name"
              className="flex-1 p-3 border rounded-lg"
            />
            <button type="button" onClick={handleAddColor} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              Add Color
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.colors.map((color, idx) => {
              const imgFile = form.images[color];
              const vidFile = videoFiles[color];
              return (
                <div key={color} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="capitalize font-medium">{color}</span>
                    <button type="button" onClick={() => handleRemoveColor(color)} className="text-red-500 text-sm">
                      Remove
                    </button>
                  </div>

                  {/* Stock input */}
                  <label className="block text-sm mb-1">Stock for {color}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.variantStocks?.[color] || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        variantStocks: { ...prev.variantStocks, [color]: Number(e.target.value) || 0 },
                      }))
                    }
                    className="block w-full text-sm mb-3 p-2 border rounded"
                  />

                  {/* Image input */}
                  <label className="block text-sm mb-2">Image *</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageChange(color, e.target.files?.[0])} />
                  {imgFile && <img src={URL.createObjectURL(imgFile)} alt="" className="h-20 mt-2 object-cover" />}

                  {/* Video input */}
                  <label className="block text-sm mt-3 mb-2">Video (optional)</label>
                  <input type="file" accept="video/*" onChange={(e) => handleVideoChange(color, e.target.files?.[0])} />
                  {vidFile && <video src={URL.createObjectURL(vidFile)} className="h-32 mt-2" controls />}
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQs */}
        <div>
          <label className="block text-sm font-medium mb-2">FAQs (optional)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <input type="text" placeholder="Question" value={faqInput.question} onChange={(e) => setFaqInput({ ...faqInput, question: e.target.value })} className="p-3 border rounded-lg" />
            <input type="text" placeholder="Answer" value={faqInput.answer} onChange={(e) => setFaqInput({ ...faqInput, answer: e.target.value })} className="p-3 border rounded-lg" />
          </div>
          <button type="button" onClick={handleAddFaq} className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-4">Add FAQ</button>

          <ul className="space-y-3">
            {form.faqs.map((fq, idx) => (
              <li key={idx} className="border p-3 rounded-lg flex justify-between items-start">
                <div>
                  <p className="font-semibold">{fq.question}</p>
                  <p className="text-sm text-gray-600 mt-1">{fq.answer}</p>
                </div>
                <button type="button" onClick={() => handleRemoveFaq(idx)} className="text-red-500 text-sm">Remove</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Submit */}
        <div className="pt-4">
           <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-lg font-medium text-white ${
            isLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isLoading ? "Processing..." : "Add Product"}
        </button>
        </div>
      </form>
    </div>
  );
};

export default Add;
