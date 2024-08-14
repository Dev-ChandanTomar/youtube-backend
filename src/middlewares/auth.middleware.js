import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"


export const verifyjwt =asyncHandler(async(req,res,next)=>{
try {
       const token= req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")
       if(!token){
        throw ApiError(401,"Unauthorized request")
       }
    
      const decodeToken= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
      const user= await User.findById(decodeToken._id).select("-password -refreshToken")
      if(!user){
        throw ApiError(401,"invalide Access token")
      }
      req.user=user
      next()
} catch (error) {
    throw ApiError(401,error?.message || "")
}
})

