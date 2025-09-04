import React from 'react';
import { NavLink } from 'react-router-dom';
import { IoIosAddCircle } from "react-icons/io";
import { GoChecklist } from "react-icons/go";
import { IoCheckmarkDoneCircle } from "react-icons/io5";
import { FaTags } from "react-icons/fa";
import { BiSolidCategory } from "react-icons/bi";

const Sidebar = () => {
  return (
    <div className="w-[18%] min-h-screen border-r-2 border-gray-400">
      <div className="flex flex-col gap-4 pt-6 pl-[20%] text-[15px]">
        <NavLink
          to="/add"
          className={({ isActive }) =>
            `flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l-lg ${
              isActive ? "bg-blue-100 font-medium" : ""
            }`
          }
        >
          <IoIosAddCircle className="text-gray-800 text-3xl" />
          <p className="hidden md:block">Add Items</p>
        </NavLink>
        <NavLink
          to="/list"
          className={({ isActive }) =>
            `flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l-lg ${
              isActive ? "bg-blue-100 font-medium" : ""
            }`
          }
        >
          <GoChecklist className="text-gray-800 text-3xl" />
          <p className="hidden md:block">List Items</p>
        </NavLink>
        <NavLink
          to="/order"
          className={({ isActive }) =>
            `flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l-lg ${
              isActive ? "bg-blue-100 font-medium" : ""
            }`
          }
        >
          <IoCheckmarkDoneCircle className="text-gray-800 text-3xl" />
          <p className="hidden md:block">Orders</p>
        </NavLink>
        <NavLink
          to="/offer"
          className={({ isActive }) =>
            `flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l-lg ${
              isActive ? "bg-blue-100 font-medium" : ""
            }`
          }
        >
          <FaTags className="text-gray-800 text-3xl" />
          <p className="hidden md:block">Offers</p>
        </NavLink>
         <NavLink
          to="/manage-categories"
          className={({ isActive }) =>
            `flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l-lg ${
              isActive ? "bg-blue-100 font-medium" : ""
            }`
          }
        >
          <BiSolidCategory className="text-gray-800 text-3xl" />
          <p className="hidden md:block">Sub Category</p>
        </NavLink>

         <NavLink
          to="/testimonials"
          className={({ isActive }) =>
            `flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l-lg ${
              isActive ? "bg-blue-100 font-medium" : ""
            }`
          }
        >
          <BiSolidCategory className="text-gray-800 text-3xl" />
          <p className="hidden md:block">Happy Customers</p>
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;