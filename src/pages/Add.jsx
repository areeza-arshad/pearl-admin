import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { FiCheckCircle, FiUpload, FiLoader } from "react-icons/fi";

const Add = ({ token }) => {
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    newCategory: "",
    stock: "",
    bestseller: false,
    details: "",
    description: "",
    size: "",
    image1: null,
    image2: null,
    image3: null,
    image4: null,
  });
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/category/list`);
        if (res.data.success) {
          setCategories(res.data.categories.map((cat) => cat.name));
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to fetch categories.");
      }
    };
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setForm({
      ...form,
      [name]: files[0],
    });
  };

  const handleAddCategory = async () => {
    if (!form.newCategory) {
      toast.error("Please enter a category name.");
      return;
    }

    try {
      const res = await axios.post(
        `${backendUrl}/api/category/add`,
        { name: form.newCategory },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setCategories([...categories, form.newCategory.toLowerCase()]);
        setForm({ ...form, category: form.newCategory.toLowerCase(), newCategory: "" });
        toast.success("Category added successfully!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add category.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.image1) {
      toast.error("At least one image is required.");
      return;
    }
    if (form.details.trim().length < 10) {
      toast.error("Product details must be at least 10 characters long.");
      return;
    }
    if (form.description && form.description.trim().length < 20) {
      toast.error("Product description, if provided, must be at least 20 characters long.");
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    for (const key in form) {
      if (key !== "newCategory" && form[key] !== null) {
        formData.append(key, form[key]);
      }
    }

    try {
      await axios.post(`${backendUrl}/api/product/add`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setShowSuccessPopup(true);
      setForm({
        name: "",
        price: "",
        category: "",
        newCategory: "",
        stock: "",
        bestseller: false,
        details: "",
        description: "",
        size: "",
        image1: null,
        image2: null,
        image3: null,
        image4: null,
      });
      setTimeout(() => setShowSuccessPopup(false), 3000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative p-4 md:p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center animate-bounce-in">
            <FiCheckCircle className="mx-auto text-green-500 text-5xl mb-4" />
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">Success!</h3>
            <p className="text-gray-600 mb-4">Your product has been added successfully.</p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-gray-800">
        Add New Product
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Product Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="Enter product name"
              value={form.name}
              onChange={handleInputChange}
              className="w-full p-2 md:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Price
            </label>
            <input
              type="number"
              name="price"
              placeholder="Enter price"
              value={form.price}
              onChange={handleInputChange}
              className="w-full p-2 md:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleInputChange}
              className="w-full p-2 md:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Add New Category
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                name="newCategory"
                placeholder="Enter new category"
                value={form.newCategory}
                onChange={handleInputChange}
                className="w-full p-2 md:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Stock
            </label>
            <input
              type="number"
              name="stock"
              placeholder="Enter stock quantity"
              value={form.stock}
              onChange={handleInputChange}
              className="w-full p-2 md:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Size
            </label>
            <input
              type="text"
              name="size"
              placeholder="Enter size (e.g., Small, Medium, Large)"
              value={form.size}
              onChange={handleInputChange}
              className="w-full p-2 md:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Product Details
          </label>
          <textarea
            name="details"
            placeholder="Enter product details (e.g., Size: Medium, Material: Cotton)"
            value={form.details}
            onChange={handleInputChange}
            rows="4"
            className="w-full p-2 md:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          ></textarea>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Product Description (Optional)
          </label>
          <textarea
            name="description"
            placeholder="Enter product description"
            value={form.description}
            onChange={handleInputChange}
            rows="4"
            className="w-full p-2 md:p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="bestseller"
            checked={form.bestseller}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="text-sm font-medium text-gray-700">
            Mark as Bestseller
          </label>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Product Images</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => {
              const image = form[`image${i}`];
              return (
                <div key={i} className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500">
                    Image {i} {i === 1 && "(Main Image)"}
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id={`file-input-${i}`}
                      name={`image${i}`}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-between p-2 border border-gray-300 rounded-md">
                      <span className="text-sm text-gray-500 truncate">
                        {image ? image.name : "No file chosen"}
                      </span>
                      <button
                        type="button"
                        className="ml-2 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 flex items-center"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(`file-input-${i}`).click();
                        }}
                      >
                        <FiUpload className="mr-1" /> Choose
                      </button>
                    </div>
                  </div>
                  {image && (
                    <div className="mt-2">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${i}`}
                        className="w-full h-32 object-contain rounded-md border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full md:w-auto px-6 py-3 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center ${
              isSubmitting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? (
              <>
                <FiLoader className="animate-spin mr-2" />
                Adding Product...
              </>
            ) : (
              "Add Product"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Add;