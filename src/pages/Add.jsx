import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import imageCompression from "browser-image-compression";
import { backendUrl } from "../App"; // Adjust path if needed

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
    if (!color) {
      toast.error("Please enter a color name");
      return;
    }
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

  // File change (compress and validate images)
  const handleImageChange = async (color, file) => {
    if (!file) {
      console.log("No file selected for color", color);
      toast.error("No file selected");
      return;
    }

    // Compress image if larger than 1MB
    let processedFile = file;
    if (file.size > 1 * 1024 * 1024) {
      try {
        processedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
        });
        console.log(`Compressed ${file.name} from ${(file.size / 1024).toFixed(1)} KB to ${(processedFile.size / 1024).toFixed(1)} KB`);
      } catch (err) {
        toast.error(`Failed to compress image: ${file.name}`);
        return;
      }
    }

    // Validate file size (match backend limit of 50MB)
    const maxSizeMB = 50;
    if (processedFile.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File "${processedFile.name}" exceeds ${maxSizeMB}MB limit`);
      return;
    }

    // Validate image
    const img = new Image();
    img.src = URL.createObjectURL(processedFile);
    img.onload = () => {
      console.log(`Image ${processedFile.name} dimensions: ${img.width}x${img.height}`);
      if (img.width < 300 || img.height < 300) {
        toast.warn(`Image "${processedFile.name}" is low resolution (${img.width}x${img.height})`);
      }
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      toast.error(`File "${processedFile.name}" is not a valid image`);
      URL.revokeObjectURL(img.src);
      return;
    };

    console.log("Selected file for", color, "->", processedFile.name, processedFile.type, processedFile.size);
    setForm((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [color]: processedFile,
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
    if (!faqInput.question || !faqInput.answer) {
      toast.error("Please provide both question and answer for FAQ");
      return;
    }
    setForm((prev) => ({ ...prev, faqs: [...prev.faqs, faqInput] }));
    setFaqInput({ question: "", answer: "" });
  };
  const handleRemoveFaq = (idx) =>
    setForm((prev) => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== idx) }));

  // Retry function for axios
  const axiosWithRetry = async (config, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await axios(config);
      } catch (err) {
        if (i === retries - 1) throw err;
        console.warn(`Retry ${i + 1} for axios request: ${err.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate that each color has an image
      const missingImages = form.colors.filter((color) => !form.images[color]);
      if (missingImages.length > 0) {
        toast.error(`Please upload images for colors: ${missingImages.join(", ")}`);
        setIsLoading(false);
        return;
      }

      if (form.colors.length === 0) {
        toast.error("Please add at least one color variant");
        setIsLoading(false);
        return;
      }

      if (form.colors.length > 30) {
        toast.error("Maximum 30 color variants allowed");
        setIsLoading(false);
        return;
      }

      const formData = new FormData();

      // Append scalar fields
      const scalarFields = {
        name: form.name,
        price: form.price,
        category: form.category,
        subcategory: form.subcategory,
        stock: form.stock,
        bestseller: form.bestseller,
        description: form.description,
        size: form.size,
      };

      Object.entries(scalarFields).forEach(([key, value]) => {
        formData.append(key, value === undefined || value === null ? "" : String(value));
      });

      // Append arrays as JSON
      formData.append("details", JSON.stringify(form.details || []));
      formData.append("faqs", JSON.stringify(form.faqs || []));
      formData.append("colors", JSON.stringify(form.colors || []));

      // Append variant images
      form.colors.forEach((color, i) => {
        const file = form.images[color];
        if (file) {
          formData.append(`variantImage${i}`, file);
          console.log(`Appended variantImage${i}: ${file.name} (${(file.size / 1024).toFixed(1)} KB) for color ${color}`);
        }
      });

      // Debug FormData
      console.log("FormData entries:");
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value instanceof File ? `${value.name} (${(value.size / 1024).toFixed(1)} KB)` : value}`);
      }

      const response = await axiosWithRetry({
        method: "post",
        url: `${backendUrl}/api/product/add`,
        data: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 600000, // 10 minutes
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
      });
    } catch (err) {
      console.error("Error submitting form:", err);
      if (err.response) {
        console.error("Server response:", err.response.status, err.response.data);
        toast.error(err.response.data?.message || `Failed (${err.response.status})`);
      } else if (err.code === "ECONNABORTED") {
        toast.error("Request timed out. Try smaller images or check your network.");
      } else if (err.code === "ERR_NETWORK") {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error(err.message || "Failed to upload product");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Product</h2>

      <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Basic Information</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Product Name*</label>
            <input
              name="name"
              value={form.name}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Price*</label>
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
            <label className="block text-sm font-medium mb-1">Category*</label>
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
            <label className="block text-sm font-medium mb-1">Subcategory</label>
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
            <label className="block text-sm font-medium mb-1">Stock*</label>
            <input
              name="stock"
              type="number"
              value={form.stock}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Size</label>
            <input
              name="size"
              value={form.size}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          <div className="flex items-center md:col-span-2">
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
          <label className="block text-sm font-medium mb-1">Description*</label>
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
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              type="text"
              placeholder="Slim fit, 100% cotton..."
              className="flex-1 p-3 border rounded-lg"
              value={detailInput}
              onChange={(e) => setDetailInput(e.target.value)}
            />
            <button 
              type="button" 
              onClick={handleAddDetail} 
              className="bg-blue-600 text-white px-4 py-3 sm:py-2 rounded-lg"
            >
              Add Detail
            </button>
          </div>
          <ul className="space-y-2">
            {form.details.map((d, i) => (
              <li key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span>{d}</span>
                <button 
                  type="button" 
                  onClick={() => handleRemoveDetail(d)} 
                  className="text-red-500 text-sm px-2 py-1"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Colors & Media */}
        <div>
          <label className="block text-sm font-medium mb-2">Color Variants</label>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              placeholder="Enter color name (e.g., gold, black)"
              className="flex-1 p-3 border rounded-lg"
            />
            <button 
              type="button" 
              onClick={handleAddColor} 
              className="bg-blue-600 text-white px-4 py-3 sm:py-2 rounded-lg"
            >
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
                    <button 
                      type="button" 
                      onClick={() => handleRemoveColor(color)} 
                      className="text-red-500 text-sm px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>

                  <label className="block text-sm mb-2">Attach image for {color}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(color, e.target.files?.[0])}
                    className="block w-full text-sm mb-3 p-2 border rounded"
                  />

                  {file ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-sm flex-1">
                        <div className="font-medium truncate">{file.name}</div>
                        <div className="text-xs text-gray-500">{file.type || "unknown type"}</div>
                        <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview for ${color}`}
                          className="mt-2 h-20 w-20 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFileForColor(color)}
                          className="text-red-500 text-sm px-2 py-1 mt-2 sm:mt-0"
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">No image selected</div>
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
            <input
              type="text"
              placeholder="Question"
              value={faqInput.question}
              onChange={(e) => setFaqInput({ ...faqInput, question: e.target.value })}
              className="p-3 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Answer"
              value={faqInput.answer}
              onChange={(e) => setFaqInput({ ...faqInput, answer: e.target.value })}
              className="p-3 border rounded-lg"
            />
          </div>
          <button 
            type="button" 
            onClick={handleAddFaq} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-4"
          >
            Add FAQ
          </button>

          <ul className="space-y-3">
            {form.faqs.map((fq, idx) => (
              <li key={idx} className="border p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="font-semibold">{fq.question}</p>
                  <p className="text-sm text-gray-600 mt-1">{fq.answer}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFaq(idx)}
                  className="text-red-500 text-sm px-3 py-1"
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
            className={`w-full py-3 px-6 rounded-lg font-medium text-white ${
              isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
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