import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import Auth from "../pages/Auth";

const AuthModel = ({ onClose }) => {
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    if (userData) {
      onClose();
    }
  }, [userData, onClose]);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/30 backdrop-blur-md px-4">
      <div className="relative w-full max-w-md">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-8 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:bg-gray-200 "
        >
          <FaTimes size={18} className="text-gray-700" />
        </button>

        <Auth isModel={true} />
      </div>
    </div>
  );
};

export default AuthModel;