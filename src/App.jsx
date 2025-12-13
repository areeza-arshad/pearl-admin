import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Add from './pages/Add';
import List from './pages/List';
import Offer from './pages/Offer';
import Login from './components/Login';
import ManageCategories from './pages/ManageCategories';
import Order from './pages/Order';
import Edit from './pages/Edit';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Testimonials from './pages/Testimonials';

export const backendUrl = import.meta.env.VITE_BACKEND_URL;

export const currency = 'PKR';

const App = () => {
  const [token, setToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken); // auto-login if token exists
    } else {
      toast.warning("Please login first!");
    }
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    navigate('/');
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <ToastContainer />
      {token === '' ? (
        <Login setToken={setToken} />
      ) : (
        <>
          <Navbar setToken={handleLogout} />
          <hr className="border-gray-200" />
          <div className="flex">
            <Sidebar />
            <div className="w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base">
              <Routes>
                <Route path="/add" element={<Add token={token} />} />
                <Route path="/list" element={<List token={token} />} />
              
                <Route path="/offer" element={<Offer token={token} />} />
                <Route path="/manage-categories" element={<ManageCategories token={token} />} />
                <Route path="/edit/:id" element={<Edit token={token} />} />
                <Route path="/testimonials" element={<Testimonials token={token} />} />
                <Route path="/order" element={<Order token={token} />} />
              </Routes>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
