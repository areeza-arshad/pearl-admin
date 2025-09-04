import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";

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
  faqs: [], // ✅ NEW
});


  const [colorInput, setColorInput] = useState("");
  const [detailInput, setDetailInput] = useState("");
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [faqInput, setFaqInput] = useState({ question: "", answer: "" });


  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/category/list`);
        setCategories(res.data.categories);
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

  // 🔹 Add bullet point detail
  const handleAddDetail = () => {
    const text = detailInput.trim();
    if (text && !form.details.includes(text)) {
      setForm((prev) => ({
        ...prev,
        details: [...prev.details, text],
      }));
      setDetailInput("");
    }
  };

  // 🔹 Remove detail
  const handleRemoveDetail = (detail) => {
    setForm((prev) => ({
      ...prev,
      details: prev.details.filter((d) => d !== detail),
    }));
  };

  // 🔹 Add color variant
  const handleAddColor = () => {
    const color = colorInput.trim().toLowerCase();
    if (color && !form.colors.includes(color)) {
      setForm((prev) => ({
        ...prev,
        colors: [...prev.colors, color],
      }));
      setColorInput("");
    }
  };

  // 🔹 Add image for a color
  const handleImageChange = (color, file) => {
    setForm((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [color]: file,
      },
    }));
  };

  // 🔹 Remove color
  const handleRemoveColor = (color) => {
    setForm((prev) => {
      const updatedColors = prev.colors.filter((c) => c !== color);
      const updatedImages = { ...prev.images };
      delete updatedImages[color];
      return {
        ...prev,
        colors: updatedColors,
        images: updatedImages,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    // Append basic fields
    Object.entries(form).forEach(([key, value]) => {
      if (key !== "colors" && key !== "images" && key !== "details") {
        formData.append(key, value);
      }
    });

    // Append details (bullet points as JSON)
// Append details
formData.append("details", JSON.stringify(form.details));

// Append FAQs ✅
formData.append("faqs", JSON.stringify(form.faqs));

// Append colors + images
formData.append("colors", JSON.stringify(form.colors));
for (const color of form.colors) {
  if (form.images[color]) {
    formData.append("images", form.images[color]);
  }
}

    try {
      await axios.post(`${backendUrl}/api/product/add`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Product added successfully!");
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
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(error.response?.data?.message || "Failed to add product");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Product</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Information */}
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

          {/* Category Dropdown */}
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

          {/* Subcategory Dropdown */}
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
                .find((cat) => cat.name === form.category)
                ?.subcategories.map((sub, idx) => (
                  <option key={idx} value={sub}>
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

        {/* Product Details (Bullet Points) */}
        <div>
          <label className="block text-sm font-medium mb-2">Product Details*</label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={detailInput}
              onChange={(e) => setDetailInput(e.target.value)}
              placeholder="Enter a detail (e.g., Slim fit)"
              className="flex-1 p-3 border rounded-lg"
            />
            <button
              type="button"
              onClick={handleAddDetail}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Add
            </button>
          </div>

          <ul className="list-disc list-inside space-y-1">
            {form.details.map((detail, idx) => (
              <li key={idx} className="flex justify-between items-center">
                <span>{detail}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDetail(detail)}
                  className="text-red-500 text-sm"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Color Variants */}
        <div>
          <label className="block text-sm font-medium mb-2">Color Variants*</label>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              placeholder="Enter color name (e.g., gold, silver)"
              className="flex-1 p-3 border rounded-lg"
            />
            <button
              type="button"
              onClick={handleAddColor}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Add Color
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.colors.map((color) => (
              <div key={color} className="border p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="capitalize font-medium">{color}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(color)}
                    className="text-red-500 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <label className="block text-sm mb-2">Image for {color}*</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(color, e.target.files[0])}
                  className="block w-full text-sm"
                  required
                />
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
<div>
  <label className="block text-sm font-medium mb-2">FAQs</label>
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
    <button
      type="button"
      onClick={() => {
        if (faqInput.question && faqInput.answer) {
          setForm((prev) => ({
            ...prev,
            faqs: [...prev.faqs, faqInput],
          })); // i
          setFaqInput({ question: "", answer: "" });
        }
      }}
      className="bg-blue-600 text-white px-4 py-2 rounded"
    >
      Add FAQ
    </button>
  </div>

  <ul className="space-y-2">
    {form.faqs.map((faq, idx) => (
      <li key={idx} className="border p-2 rounded flex justify-between items-start">
        <div>
          <p className="font-semibold">{faq.question}</p>
          <p className="text-sm text-gray-600">{faq.answer}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            setForm((prev) => ({
              ...prev,
              faqs: prev.faqs.filter((_, i) => i !== idx),
            }))
          }
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
            disabled={isLoading || form.colors.length === 0}
            className={`w-full py-3 px-6 rounded-lg font-medium text-white ${
              isLoading || form.colors.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
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
