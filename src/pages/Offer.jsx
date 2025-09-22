// src/admin/Offer.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { FiX, FiCheckCircle, FiPlus, FiTrash2 } from "react-icons/fi";

/**
 * Admin Offer component
 * Props:
 *  - token (admin JWT)
 *
 * Endpoints used:
 *  - GET  ${backendUrl}/api/category/list          -> fetch categories
 *  - GET  ${backendUrl}/api/offer/active           -> fetch active offers
 *  - POST ${backendUrl}/api/offer/add              -> create offer (admin)
 *  - DELETE ${backendUrl}/api/offer/delete/:id     -> delete offer (admin)
 */
const Offer = ({ token }) => {
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]); // array of _id
  const [applyToSubcategories, setApplyToSubcategories] = useState(false);

  const [form, setForm] = useState({
    code: "",
    discountPercentage: "",
    description: "",
    expiresAt: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [currentOffer, setCurrentOffer] = useState(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // fetch categories (for multi-select)
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await axios.get(`${backendUrl}/api/category/list`);
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      toast.error("Failed to fetch categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  // fetch offers (active)
  const fetchOffers = async () => {
    try {
      setLoadingOffers(true);
      // For admin view we can still call /active; the route returns active offers only
      const res = await axios.get(`${backendUrl}/api/offer/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers(res.data.offers || []);
    } catch (err) {
      console.error("Failed to fetch offers:", err);
      toast.error("Failed to fetch offers");
    } finally {
      setLoadingOffers(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    if (token) fetchOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearForm = () => {
    setForm({
      code: "",
      discountPercentage: "",
      description: "",
      expiresAt: "",
    });
    setSelectedCategories([]);
    setApplyToSubcategories(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Basic validation
    if (!form.code.trim()) return toast.error("Offer code is required");
    if (!form.discountPercentage || Number(form.discountPercentage) <= 0)
      return toast.error("Enter a valid discount percentage");

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        discountPercentage: Number(form.discountPercentage),
        categories: selectedCategories, // array of category _id (empty => global)
        applyToSubcategories,
      };

      await axios.post(`${backendUrl}/api/offer/add`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowSuccessPopup(true);
      setCurrentOffer(form.code.toUpperCase());
      setTimeout(() => setShowSuccessPopup(false), 3000);

      clearForm();
      fetchOffers();
      toast.success("Offer created");
    } catch (err) {
      console.error("Failed to create offer:", err);
      const msg = err.response?.data?.message || "Failed to create offer";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      const res = await axios.delete(`${backendUrl}/api/offer/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data.message || "Offer deleted");
      fetchOffers();
    } catch (err) {
      console.error("Failed to delete offer:", err);
      const msg = err.response?.data?.message || "Failed to delete offer";
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-white shadow-md rounded-lg">
      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <FiCheckCircle className="mx-auto text-green-500 text-5xl mb-4" />
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">Offer Created!</h3>
            <p className="text-gray-600 mb-4">
              Your offer code <span className="font-bold">{currentOffer}</span> has been successfully created.
            </p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">Create New Offer</h2>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Offer Code</label>
            <input
              name="code"
              type="text"
              placeholder="SUMMER20"
              value={form.code}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Discount %</label>
            <input
              name="discountPercentage"
              type="number"
              placeholder="20"
              min="1"
              max="100"
              value={form.discountPercentage}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input
            name="description"
            type="text"
            placeholder="Summer special discount"
            value={form.description}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
            <input
              name="expiresAt"
              type="date"
              value={form.expiresAt}
              onChange={handleChange}
              min={new Date().toISOString().split("T")[0]}
              className="w-full border border-gray-300 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Apply to Subcategories?</label>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={applyToSubcategories}
                  onChange={() => setApplyToSubcategories((v) => !v)}
                />
                <span className="text-sm">Yes (applies to selected category and its subcategories)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Categories multi-select */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Apply to Categories</label>
          <div className="p-3 border rounded max-h-48 overflow-auto bg-gray-50">
            <div className="mb-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="scope"
                  checked={selectedCategories.length === 0}
                  onChange={() => setSelectedCategories([])}
                />
                <span className="text-sm ml-2">Global (applies to all categories)</span>
              </label>
            </div>

            {loadingCategories ? (
              <p className="text-sm text-gray-500">Loading categories...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-gray-500">No categories found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <label key={cat._id} className="flex items-center space-x-2 p-1 rounded hover:bg-white">
                    <input
                      type="checkbox"
                      value={cat._id}
                      checked={selectedCategories.includes(cat._id)}
                      onChange={() => toggleCategory(cat._id)}
                    />
                    <span className="text-sm capitalize">{cat.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">If you leave categories empty, the offer is considered global.</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex items-center justify-center w-full md:w-auto px-6 py-3 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
            isSubmitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            <>
              <FiPlus className="mr-2" />
              Create Offer
            </>
          )}
        </button>
      </form>

      <h3 className="text-lg md:text-xl font-semibold mb-4 text-gray-800">Active Offers</h3>

      {loadingOffers ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading offers...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No active offers available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.map((offer) => (
            <div key={offer._id} className="border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow relative bg-white">
              <button
                onClick={() => handleDelete(offer._id)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors duration-200 z-10"
                title="Delete offer"
              >
                <FiTrash2 size={18} />
              </button>

              <div className="flex items-start justify-between pr-12">
                <div>
                  <h4 className="font-bold text-lg text-blue-600">{offer.code}</h4>
                  {offer.description && <p className="text-sm text-gray-600 mt-1">{offer.description}</p>}

                  {/* categories */}
                  <div className="mt-2">
                    {offer.categories && offer.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {offer.categories.map((c) => (
                          <span key={c._id || c} className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
                            {c.name || c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs bg-yellow-100 px-2 py-1 rounded">Global</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                    {offer.discountPercentage}% OFF
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                {offer.expiresAt && (
                  <p>Expires: {new Date(offer.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                )}
                <p className="mt-1">Created: {new Date(offer.createdAt).toLocaleDateString()}</p>
                {offer.applyToSubcategories && <p className="mt-1 text-xs text-gray-500">Applies to subcategories</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Offer;
