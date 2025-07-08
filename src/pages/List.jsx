import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { backendUrl, currency } from '../App';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const List = ({ token }) => {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/product/list`);
      if (res.data.success) {
        setProducts(res.data.products);
      } else {
        toast.error("Failed to fetch products");
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong");
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await axios.post(`${backendUrl}/api/product/remove`, { id }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.data.success) {
        toast.success("Product removed");
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-semibold text-gray-700">Product List</h2>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded-lg">
          <thead className="bg-gray-100 text-gray-600 text-sm">
            <tr>
              <th className="p-4 text-left">Image</th>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Category</th>
              <th className="p-4 text-left">Price</th>
              <th className="p-4 text-left">Stock</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((item) => (
              <tr key={item._id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <img 
                    src={Array.isArray(item.image) && item.image.length > 0 ? item.image[0] : '/fallback-image.jpg'} 
                    alt={item.name} 
                    className="w-16 h-16 object-cover rounded" 
                  />
                </td>
                <td className="p-4">{item.name}</td>
                <td className="p-4">{item.category}</td>
                <td className="p-4">{currency} {item.price}</td>
                <td className="p-4">{item.stock}</td>
                <td className="p-4">
                  <button
                    onClick={() => deleteProduct(item._id)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {products.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No products found.
          </div>
        ) : (
          products.map((item) => (
            <div key={item._id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-start space-x-4">
                <img 
                  src={Array.isArray(item.image) && item.image.length > 0 ? item.image[0] : '/fallback-image.jpg'} 
                  alt={item.name} 
                  className="w-20 h-20 object-cover rounded" 
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.category}</p>
                  <div className="mt-2 flex justify-between items-center">
                    <div>
                      <p className="text-gray-700">{currency} {item.price}</p>
                      <p className="text-sm text-gray-500">Stock: {item.stock}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => deleteProduct(item._id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default List;