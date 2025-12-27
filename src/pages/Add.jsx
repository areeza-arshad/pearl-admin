// src/admin/Add.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
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
    images: {},
    uploadedImages: {},
    faqs: [],
    size: "",
    variantStocks: {},
    difficulty: "easy"
  });

  const [videoFiles, setVideoFiles] = useState({});
  const [colorInput, setColorInput] = useState("");
  const [detailInput, setDetailInput] = useState("");
  const [faqInput, setFaqInput] = useState({ question: "", answer: "" });
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [colorEdits, setColorEdits] = useState({});
  const [editingDetailIdx, setEditingDetailIdx] = useState(null);
  const [editingDetailValue, setEditingDetailValue] = useState("");
  const [editingFaqIdx, setEditingFaqIdx] = useState(null);
  const [editingFaq, setEditingFaq] = useState({ question: "", answer: "" });

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

  const beginEditFaq = (idx) => {
    setEditingFaqIdx(idx);
    setEditingFaq({ ...form.faqs[idx] });
  };

  const saveFaqEdit = () => {
    if (!editingFaq.question.trim() || !editingFaq.answer.trim()) {
      toast.error("Both question and answer required");
      return;
    }
    setForm((prev) => ({
      ...prev,
      faqs: prev.faqs.map((fq, i) => (i === editingFaqIdx ? editingFaq : fq)),
    }));
    setEditingFaqIdx(null);
    setEditingFaq({ question: "", answer: "" });
  };

  const cancelFaqEdit = () => {
    setEditingFaqIdx(null);
    setEditingFaq({ question: "", answer: "" });
  };

  const beginEditDetail = (idx) => {
    setEditingDetailIdx(idx);
    setEditingDetailValue(form.details[idx] ?? "");
  };

  const saveDetailEdit = () => {
    const v = editingDetailValue.trim();
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
  const renameVariantColor = (oldColor, nextRaw) => {
    const newColor = String(nextRaw || "").trim().toLowerCase();
    if (!newColor) return toast.error("Enter a valid color name");
    if (newColor === oldColor) return; // nothing to do

    setForm((prev) => {
      if (prev.colors.includes(newColor)) {
        toast.warn(`"${newColor}" already exists`);
        return prev;
      }

      // update colors array
      const colors = prev.colors.map((c) => (c === oldColor ? newColor : c));

      // move image file reference
      const images = { ...prev.images };
      if (images[oldColor]) {
        images[newColor] = images[oldColor];
        delete images[oldColor];
      }

      // move per-variant stock
      const variantStocks = { ...prev.variantStocks };
      if (Object.prototype.hasOwnProperty.call(variantStocks, oldColor)) {
        variantStocks[newColor] = variantStocks[oldColor];
        delete variantStocks[oldColor];
      }

      return { ...prev, colors, images, variantStocks };
    });

    // move video file reference too
    setVideoFiles((prev) => {
      const copy = { ...prev };
      if (copy[oldColor]) {
        copy[newColor] = copy[oldColor];
        delete copy[oldColor];
      }
      return copy;
    });

    // clean the temp edit input for the old key
    setColorEdits((prev) => {
      const copy = { ...prev };
      delete copy[oldColor];
      return copy;
    });

    toast.success(`Color changed to "${newColor}"`);
  };
  
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

  const handleImageChange = (color, file) => {
    if (!file) return toast.error("No file selected");
    if (!file.type.startsWith("image/")) return toast.error("Please select a valid image file");
    if (file.size > MAX_IMAGE_MB * 1024 * 1024)
      return toast.error(`Image exceeds ${MAX_IMAGE_MB}MB limit`);

    // Local preview only

    setForm(prev => ({
      ...prev,
      images: { ...prev.images, [color]: file },
    }));
  };


  // ✅ SIMPLE VIDEO UPLOAD - NO COMPRESSION
  const handleVideoChange = (color, file) => {
    if (!file) return;
    
    // Basic validation
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file");
      return;
    }
    
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Video exceeds ${MAX_VIDEO_MB}MB limit`);
      return;
    }
    
    // Just store the file
    setVideoFiles(prev => ({
      ...prev,
      [color]: file,
    }));
    
    toast.info(`Video selected for ${color}`);
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
      // Basic validation
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
      
      // Check each color has either image OR video
      const missingMedia = form.colors.filter((c) => !form.images[c] && !videoFiles[c]);
      if (missingMedia.length > 0) {
        toast.error(`Please upload an image or a video for: ${missingMedia.join(", ")}`);
        setIsLoading(false);
        return;
      }

      // Prepare FormData
      const formData = new FormData();
      
      // Add text fields
      Object.entries({
        name: form.name,
        price: form.price,
        category: (form.category || "").toLowerCase(),
        subcategory: (form.subcategory || "").toLowerCase(),
        stock: form.stock,
        bestseller: form.bestseller,
        description: form.description,
        size: form.size,
        difficulty: form.difficulty || "easy"
      }).forEach(([k, v]) => formData.append(k, String(v ?? "")));

      // Add arrays as JSON
      formData.append("details", JSON.stringify(form.details || []));
      formData.append("faqs", JSON.stringify(form.faqs || []));
      formData.append("colors", JSON.stringify(form.colors || []));
      formData.append(
        "variantStocks",
        JSON.stringify(form.colors.map((c) => form.variantStocks?.[c] || 0))
      );

      // ✅ Add image and video files with correct naming
      form.colors.forEach((color, index) => {
        const imageFile = form.images[color];
        const videoFile = videoFiles[color];
        
        if (imageFile instanceof File) {
          formData.append(`variantImage${index}`, imageFile);
        }
        
        if (videoFile instanceof File) {
          formData.append(`variantVideo${index}`, videoFile);
        }
      });
      
      // Get token from localStorage
      const token = localStorage.getItem("adminToken");
      if (!token) {
        toast.error("Admin not logged in or token missing");
        console.error("No admin token found in localStorage!");
        setIsLoading(false);
        return;
      }

      // Submit to backend
      const response = await axiosWithRetry({
        method: "post",
        url: `${backendUrl}/api/product/add`,
        data: formData,
        headers: { 
          Authorization: `Bearer ${token}`
        },
        timeout: 10 * 60 * 1000, // 10 minutes timeout
      });

      console.log("Backend response:", response.data);
      
      // Extract image URLs from variants
      
      const variants = response.data?.product?.variants || [];
      const variantColors = variants.map(v => v.color);
      let uploadedImages = {};
      
      variants.forEach((variant) => {
        const color = variant.color;
        const images = variant.images || [];
        
        if (color && images.length > 0) {
          // Use the first image in the array
          uploadedImages[color] = images[0];
          console.log(`Extracted image for ${color}:`, images[0]);
        }
      });
      console.log("Extracted colors:", variantColors);
      console.log("Extracted images:", uploadedImages);
      
      console.log("All extracted images:", uploadedImages);

      toast.success(response.data?.message || "Product added successfully!");
      
      // Reset form with uploaded image URLs
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
        images: {}, // Clear local files
        uploadedImages: {}, 
        faqs: [],
        size: "",
        variantStocks: {},
        difficulty: "easy"
      });
      
      setVideoFiles({});
      setColorInput("");
      setDetailInput("");
      setFaqInput({ question: "", answer: "" });
      
      // Show additional success if images were uploaded
      if (Object.keys(uploadedImages).length > 0) {
        toast.success(`${Object.keys(uploadedImages).length} image(s) uploaded to ImageKit`);
      }
      
    } catch (err) {
      console.error("Add product error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to add product");
    } finally {
      setIsLoading(false);
    }
  };




  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Product</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="block text-sm font-medium mb-1">Difficulty*</label>
            <select
              name="difficulty"
              value={form.difficulty}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
              required
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="difficult">Difficult</option>
            </select>
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
            {form.details.map((d, idx) => {
              const isEditing = editingDetailIdx === idx;
              return (
                <li key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
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
                        <button type="button" onClick={saveDetailEdit} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                        <button type="button" onClick={cancelDetailEdit} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => beginEditDetail(idx)} className="text-blue-600 text-sm">Edit</button>
                        <button type="button" onClick={() => handleRemoveDetail(d)} className="text-red-500 text-sm">Remove</button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Color Variants */}
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
            <button type="button" onClick={handleAddColor} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Add Color</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.colors.map((color, idx) => {
              const imgFile = form.images[color];
              const vidFile = videoFiles[color];
              return (
                <div key={color} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        className="capitalize font-medium border rounded px-2 py-1 text-sm"
                        value={colorEdits[color] ?? color}
                        onChange={(e) => setColorEdits((prev) => ({ ...prev, [color]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            renameVariantColor(color, colorEdits[color] ?? color);
                          }
                        }}
                      />
                      <button type="button" onClick={() => { console.log("Apply clicked for", color, colorEdits[color] || color); renameVariantColor(color, colorEdits[color] || color); }}  className="text-blue-600 text-xs underline" title="Apply new color name">Apply</button>
                    </div>
                    <button type="button" onClick={() => handleRemoveColor(color)} className="text-red-500 text-sm">Remove</button>
                  </div>

                  {/* Stock input */}
                  <label className="block text-sm mb-1">Stock for {color}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.variantStocks?.[color] || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, variantStocks: { ...prev.variantStocks, [color]: Number(e.target.value) || 0 } }))}
                    className="block w-full text-sm mb-3 p-2 border rounded"
                  />

                  {/* Image input */}
                  <label className="block text-sm mb-2">Image *</label>
                  <input
                    key={color} // ensures React resets input for each color
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                       console.log("File selected:", {
                        exists: !!file,
                        name: file?.name,
                        type: file?.type,
                        size: file?.size
                      });
                      handleImageChange(color, file);
                    }}
                    className="block w-full text-sm"
                  />

                  {form.uploadedImages?.[color] ? (
                      <div>
                        <img
                          src={form.uploadedImages[color]}
                          alt={color}
                          className="h-20 mt-2 object-cover rounded"
                          crossOrigin="anonymous"
                        />
                        <p className="text-xs text-gray-500">Uploaded to ImageKit ✓</p>
                      </div>
                    ) : form.images[color] ? (
                      // Show local preview
                      <div>
                        <img
                          src={URL.createObjectURL(form.images[color])}
                          alt={color}
                          className="h-20 mt-2 object-cover rounded"
                          crossOrigin="anonymous"
                        />
                        <p className="text-xs text-gray-500">Local preview (not uploaded yet)</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No image</span>
                    )}

                  {/* Video input */}
                  <label className="block text-sm mt-3 mb-2">Video (optional)</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleVideoChange(color, e.target.files?.[0])}
                    className="block w-full text-sm"
                  />
                  {vidFile && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">{vidFile.name} ({(vidFile.size / 1024 / 1024).toFixed(1)}MB)</p>
                      <video src={URL.createObjectURL(vidFile)} className="h-32 w-full object-cover rounded" controls />
                    </div>
                  )}
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
            {form.faqs.map((fq, idx) => {
              const isEditing = editingFaqIdx === idx;
              return (
                <li key={idx} className="border p-3 rounded-lg flex justify-between items-start">
                  <div className="flex-1">
                    {isEditing ? (
                      <>
                        <input className="w-full mb-2 p-2 border rounded" value={editingFaq.question} onChange={(e) => setEditingFaq((prev) => ({ ...prev, question: e.target.value }))} placeholder="Edit question" />
                        <input className="w-full mb-2 p-2 border rounded" value={editingFaq.answer} onChange={(e) => setEditingFaq((prev) => ({ ...prev, answer: e.target.value }))} placeholder="Edit answer" />
                      </>
                    ) : (
                      <>
                        <p className="font-semibold">{fq.question}</p>
                        <p className="text-sm text-gray-600 mt-1">{fq.answer}</p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 ml-3">
                    {isEditing ? (
                      <>
                        <button onClick={saveFaqEdit} className="text-green-600 text-sm">Save</button>
                        <button onClick={cancelFaqEdit} className="text-gray-500 text-sm">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => beginEditFaq(idx)} className="text-blue-600 text-sm">Edit</button>
                        <button onClick={() => handleRemoveFaq(idx)} className="text-red-500 text-sm">Remove</button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-6 rounded-lg font-medium text-white ${isLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
          >
            {isLoading ? "Processing..." : "Add Product"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Add;