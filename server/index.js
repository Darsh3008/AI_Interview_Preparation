import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/connectDB.js";
import cookieParser from "cookie-parser";
const app = express();
dotenv.config();
import cors from "cors"
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.routes.js";
import interviewRouter from "./routes/interview.route.js";
import paymentRouter from "./routes/payment.route.js";


app.use(cors({
    origin:"https://ai-interview-preparation-1-wqwa.onrender.com",
    credentials:true
}))
app.use(express.json())
app.use(cookieParser())

app.use("/api/auth" , authRouter)
app.use("/api/user" , userRouter)
app.use("/api/interview" , interviewRouter)
app.use("/api/payment" , paymentRouter)

const PORT = process.env.PORT
app.listen(PORT , ()=>{
    console.log(`Server running on ${PORT}`);
    connectDB();
})
