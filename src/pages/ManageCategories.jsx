import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";

const ManageCategories = ({ token }) => {
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/category/list`);
      setCategories(res.data.categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return toast.error("Enter category name");
    try {
      await axios.post(
        `${backendUrl}/api/category/add`,
        { name: categoryName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Category added");
      setCategoryName("");
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add category");
    }
  };

  const handleAddSubcategory = async () => {
    if (!selectedCategory || !subcategory.trim()) return toast.error("Select category and enter subcategory");
    try {
      await axios.post(
        `${backendUrl}/api/category/add-subcategory`,
        { categoryName: selectedCategory, subcategory },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Subcategory added");
      setSubcategory("");
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add subcategory");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Manage Categories</h2>

      {/* Add Category */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">Add Category</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Category name"
            className="col-span-1 sm:col-span-2 border p-2 rounded"
          />
          <button 
            onClick={handleAddCategory} 
            className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors"
          >
            Add Category
          </button>
        </div>
      </div>

      {/* Add Subcategory */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">Add Subcategory</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="col-span-1 sm:col-span-2 border p-2 rounded"
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <input
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            placeholder="Subcategory name"
            className="col-span-1 sm:col-span-1 border p-2 rounded"
          />
          <button 
            onClick={handleAddSubcategory} 
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
          >
            Add Subcategory
          </button>
        </div>
      </div>

      {/* Category List */}
      <div>
        <h3 className="font-medium mb-2">Existing Categories</h3>
        <ul className="space-y-3">
          {categories.map((cat) => (
            <li key={cat._id} className="border p-3 rounded">
              <strong className="text-lg">{cat.name}</strong>
              {cat.subcategories.length > 0 && (
                <ul className="mt-2 ml-2 sm:ml-4 space-y-1">
                  {cat.subcategories.map((sub, idx) => (
                    <li key={idx} className="text-gray-600 bg-gray-50 p-2 rounded">
                      {sub}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ManageCategories;