import React from "react";
import { BsRobot } from "react-icons/bs";
import { IoSparkles } from "react-icons/io5";
import { FcGoogle } from "react-icons/fc";
import { motion } from "motion/react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../utils/firebase";
import axios from "axios";
import { ServerUrl } from "../App";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";

const Auth = ({ isModel = false }) => {
  const dispatch = useDispatch();

  const handleGoogleAuth = async () => {
    try {
      const response = await signInWithPopup(auth, provider);

      const user = response.user;

      const result = await axios.post(
        `${ServerUrl}/api/auth/google`,
        {
          name: user.displayName,
          email: user.email,
        },
        {
          withCredentials: true,
        }
      );

      dispatch(setUserData(result.data));
    } catch (error) {
      console.error(error);

      if (error.response) {
        console.log(error.response.data);
      }

      dispatch(setUserData(null));
    }
  };

  return (
    <div
      className={`w-full ${
        isModel
          ? "py-4"
          : "min-h-screen bg-gradient-to-br from-slate-100 via-white to-gray-200 flex items-center justify-center px-6 py-10"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`w-full ${
          isModel
            ? "max-w-md p-8"
            : "max-w-md sm:max-w-lg p-8 sm:p-10"
        } bg-white rounded-3xl shadow-2xl border border-gray-200`}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-black p-3 rounded-xl text-white shadow-lg">
            <BsRobot size={22} />
          </div>

          <h2 className="text-xl font-bold text-gray-900">
            AI Interview Preparation
          </h2>
        </div>

        {/* Heading */}
        <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-900 leading-tight">
          Continue with
        </h1>

        <div className="flex justify-center mt-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-green-700 font-semibold">
            <IoSparkles size={18} />
            AI Smart Interview
          </span>
        </div>

        {/* Description */}
        <p className="mt-6 text-center text-gray-500 text-sm md:text-base leading-7">
          Sign in to start AI-powered mock interviews, practice with
          personalized questions, track your progress, and unlock
          detailed performance insights.
        </p>

        {/* Google Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleGoogleAuth}
          className="mt-8 w-full flex items-center justify-center gap-3 rounded-xl bg-black py-3.5 text-white font-semibold shadow-lg transition-all duration-300 hover:bg-gray-900"
        >
          <FcGoogle size={24} />
          Continue with Google
        </motion.button>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-400">
          Secure Google authentication powered by Firebase.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;